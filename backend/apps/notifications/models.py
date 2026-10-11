from django.db import models
from django.conf import settings

class Notification(models.Model):
    TYPE_TRANSACTION = 'TRANSACTION'
    TYPE_SECURITY = 'SECURITY'
    TYPE_SYSTEM = 'SYSTEM'
    TYPE_APPROVAL = 'APPROVAL'

    TYPE_CHOICES = [
        (TYPE_TRANSACTION, 'Transaction Alert'),
        (TYPE_SECURITY, 'Security Notice'),
        (TYPE_SYSTEM, 'System Announcement'),
        (TYPE_APPROVAL, 'Approval Workflow'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    title = models.CharField(max_length=150)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_SYSTEM)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.user.username}: {self.title} (read={self.is_read})"
