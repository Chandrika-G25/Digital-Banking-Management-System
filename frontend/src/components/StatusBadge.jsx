import React from 'react';

export default function StatusBadge({ status }) {
  if (!status) return null;
  const s = String(status).toUpperCase();

  let badgeClass = 'badge-neutral';
  let label = status;

  if (['COMPLETED', 'APPROVED', 'VERIFIED', 'RESOLVED', 'ACTIVE', 'PAID'].includes(s)) {
    badgeClass = 'badge-success';
  } else if (['PENDING', 'IN_PROGRESS', 'OPEN', 'UNDER_REVIEW'].includes(s)) {
    badgeClass = 'badge-warning';
  } else if (['FAILED', 'REJECTED', 'CLOSED', 'FROZEN'].includes(s)) {
    badgeClass = 'badge-danger';
  } else if (['TRANSFER', 'SAVINGS', 'CURRENT', 'DEPOSIT'].includes(s)) {
    badgeClass = 'badge-info';
  }

  return (
    <span className={`badge ${badgeClass}`}>
      {label}
    </span>
  );
}
