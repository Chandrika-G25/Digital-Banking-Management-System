from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from apps.notifications.models import Notification

def send_notification_to_user(user, title, message, notification_type=Notification.TYPE_SYSTEM, extra_data=None):
    """
    Creates a Notification record in SQL DB and pushes a real-time event to the user's WebSocket channel.
    """
    notif = Notification.objects.create(
        user=user,
        title=title,
        message=message,
        notification_type=notification_type
    )

    channel_layer = get_channel_layer()
    if channel_layer:
        group_name = f"user_{user.id}"
        payload = {
            'id': notif.id,
            'title': notif.title,
            'message': notif.message,
            'notification_type': notif.notification_type,
            'created_at': notif.created_at.isoformat(),
            'extra': extra_data or {}
        }
        try:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'user_notification',
                    'data': payload
                }
            )
        except Exception:
            pass # Channels layer may not be running in isolated test runners

    return notif

def send_balance_update_to_user(user, account_number, new_balance, currency='USD'):
    """
    Pushes an instant balance update to the user's dashboard via WebSocket.
    """
    channel_layer = get_channel_layer()
    if channel_layer:
        group_name = f"user_{user.id}"
        try:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'balance_update',
                    'data': {
                        'account_number': account_number,
                        'new_balance': str(new_balance),
                        'currency': currency,
                    }
                }
            )
        except Exception:
            pass

def broadcast_branch_staff_alert(branch_id, title, message, alert_type='NEW_REQUEST', extra_data=None):
    """
    Broadcasts real-time alert to all branch staff members (Employees & Managers).
    """
    if not branch_id:
        return
    channel_layer = get_channel_layer()
    if channel_layer:
        group_name = f"branch_{branch_id}_staff"
        try:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'staff_alert',
                    'data': {
                        'title': title,
                        'message': message,
                        'alert_type': alert_type,
                        'extra': extra_data or {}
                    }
                }
            )
        except Exception:
            pass

def broadcast_branch_manager_alert(branch_id, title, message, alert_type='PENDING_APPROVAL', extra_data=None):
    """
    Broadcasts high-priority approval alert specifically to Branch Managers.
    """
    if not branch_id:
        return
    channel_layer = get_channel_layer()
    if channel_layer:
        group_name = f"branch_{branch_id}_managers"
        try:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'approval_alert',
                    'data': {
                        'title': title,
                        'message': message,
                        'alert_type': alert_type,
                        'extra': extra_data or {}
                    }
                }
            )
        except Exception:
            pass
