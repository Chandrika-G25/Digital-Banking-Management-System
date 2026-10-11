from django.db import models
from django.conf import settings

class AuditLog(models.Model):
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_actions'
    )
    action = models.CharField(max_length=100, db_index=True)
    target_model = models.CharField(max_length=50)
    target_id = models.CharField(max_length=50)
    ip_address = models.CharField(max_length=45, blank=True)
    details = models.TextField()
    branch = models.ForeignKey(
        'accounts.Branch',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        actor_name = self.actor.username if self.actor else "System"
        return f"[{self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}] {actor_name} -> {self.action} on {self.target_model}:{self.target_id}"

def log_audit_event(actor, action, target_model, target_id, details, branch=None, ip_address=''):
    if branch is None and actor and hasattr(actor, 'get_assigned_branch'):
        branch = actor.get_assigned_branch()
    
    return AuditLog.objects.create(
        actor=actor,
        action=action,
        target_model=target_model,
        target_id=str(target_id),
        details=details,
        branch=branch,
        ip_address=ip_address or ''
    )
