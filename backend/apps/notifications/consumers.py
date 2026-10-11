import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework.authtoken.models import Token
from urllib.parse import parse_qs

@database_sync_to_async
def get_user_from_token(token_key):
    try:
        token = Token.objects.select_related('user').get(key=token_key)
        return token.user
    except Token.DoesNotExist:
        return AnonymousUser()

@database_sync_to_async
def get_user_branch_id(user):
    branch = user.get_assigned_branch()
    return branch.id if branch else None

@database_sync_to_async
def get_unread_count(user):
    from apps.notifications.models import Notification
    return Notification.objects.filter(user=user, is_read=False).count()

class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        # Authenticate user from scope or query params
        user = self.scope.get('user', AnonymousUser())
        
        if not user.is_authenticated:
            # Check for token in query string ?token=...
            query_string = self.scope.get('query_string', b'').decode('utf-8')
            params = parse_qs(query_string)
            token_list = params.get('token', [])
            if token_list:
                user = await get_user_from_token(token_list[0])
                self.scope['user'] = user

        if not user.is_authenticated:
            await self.close(code=4001)
            return

        self.user = user
        self.user_group = f"user_{user.id}"
        await self.channel_layer.group_add(self.user_group, self.channel_name)

        # Branch staff / manager groups
        self.staff_group = None
        self.manager_group = None
        branch_id = await get_user_branch_id(user)

        if branch_id:
            if user.role in ['EMPLOYEE', 'BRANCH_MANAGER']:
                self.staff_group = f"branch_{branch_id}_staff"
                await self.channel_layer.group_add(self.staff_group, self.channel_name)
            if user.role == 'BRANCH_MANAGER':
                self.manager_group = f"branch_{branch_id}_managers"
                await self.channel_layer.group_add(self.manager_group, self.channel_name)

        await self.accept()

        unread = await get_unread_count(user)
        await self.send_json({
            'type': 'CONNECTION_ESTABLISHED',
            'status': 'connected',
            'user': {
                'id': user.id,
                'username': user.username,
                'role': user.role,
            },
            'unread_notifications': unread
        })

    async def disconnect(self, close_code):
        if hasattr(self, 'user') and self.user.is_authenticated:
            await self.channel_layer.group_discard(self.user_group, self.channel_name)
            if self.staff_group:
                await self.channel_layer.group_discard(self.staff_group, self.channel_name)
            if self.manager_group:
                await self.channel_layer.group_discard(self.manager_group, self.channel_name)

    async def receive_json(self, content):
        msg_type = content.get('type')
        if msg_type == 'PING':
            await self.send_json({'type': 'PONG'})
        elif msg_type == 'MARK_READ':
            # Acknowledge read
            await self.send_json({'type': 'ACK_READ'})

    # Channel Layer message handlers
    async def user_notification(self, event):
        await self.send_json({
            'type': 'NOTIFICATION',
            'data': event.get('data', {})
        })

    async def balance_update(self, event):
        await self.send_json({
            'type': 'BALANCE_UPDATED',
            'data': event.get('data', {})
        })

    async def transaction_event(self, event):
        await self.send_json({
            'type': 'TRANSACTION_EVENT',
            'data': event.get('data', {})
        })

    async def staff_alert(self, event):
        await self.send_json({
            'type': 'STAFF_ALERT',
            'data': event.get('data', {})
        })

    async def approval_alert(self, event):
        await self.send_json({
            'type': 'APPROVAL_ALERT',
            'data': event.get('data', {})
        })
