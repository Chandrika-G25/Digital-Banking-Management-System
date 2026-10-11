from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import serializers
from apps.accounts.permissions import IsBranchManager
from apps.audit.models import AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = ['id', 'actor', 'actor_name', 'action', 'target_model', 'target_id', 'ip_address', 'details', 'branch_name', 'timestamp']

    def get_actor_name(self, obj):
        return obj.actor.username if obj.actor else "System"

    def get_branch_name(self, obj):
        return obj.branch.name if obj.branch else "Headquarters"

class AuditLogListView(APIView):
    permission_classes = [IsAuthenticated, IsBranchManager]

    def get(self, request):
        branch = request.user.get_assigned_branch()
        logs = AuditLog.objects.all()
        if branch and not request.user.is_superuser:
            logs = logs.filter(branch=branch)

        # Filters
        action = request.query_params.get('action')
        if action:
            logs = logs.filter(action__icontains=action)

        search = request.query_params.get('search')
        if search:
            logs = logs.filter(details__icontains=search)

        limit = int(request.query_params.get('limit', 50))
        logs = logs.order_by('-timestamp')[:limit]

        return Response(AuditLogSerializer(logs, many=True).data)
