import React, { useState, useEffect } from 'react';
import { Users, Shield, Check, X, Edit2, AlertCircle } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import { apiRequest } from '../services/api';

export default function ManagerEmployees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/manager/employees/');
      const list = Array.isArray(data) ? data : (data?.results || []);
      setEmployees(list);
    } catch {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleToggleActive = async (empId, currentActive) => {
    try {
      await apiRequest('/manager/employees/', {
        method: 'POST',
        body: {
          employee_id: empId,
          is_active: !currentActive
        }
      });
      fetchEmployees();
    } catch {
      alert('Failed to update employee status.');
    }
  };

  const handleUpdateDesignation = async (empId) => {
    const newDesig = prompt('Enter new designation / title for employee:');
    if (!newDesig) return;

    try {
      await apiRequest('/manager/employees/', {
        method: 'POST',
        body: {
          employee_id: empId,
          designation: newDesig
        }
      });
      fetchEmployees();
    } catch {
      alert('Failed to update designation.');
    }
  };

  return (
    <DashboardLayout pageTitle="Employee Administration" subtitle="Manage branch staff roles, access privileges, and designations">
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Employee Name</th>
              <th>Employee ID</th>
              <th>System Role</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Status</th>
              <th>Staff Management</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td>
                  <strong style={{ color: 'var(--navy-900)' }}>{emp.name}</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>{emp.email}</div>
                </td>
                <td>
                  <code style={{ color: 'var(--blue-600)' }}>{emp.employee_id}</code>
                </td>
                <td>
                  <span className="badge badge-info">{emp.role.replace('_', ' ')}</span>
                </td>
                <td>{emp.department}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{emp.designation}</span>
                    <button
                      onClick={() => handleUpdateDesignation(emp.employee_id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}
                      title="Edit Designation"
                    >
                      <Edit2 size={13} />
                    </button>
                  </div>
                </td>
                <td>
                  <span className={`badge ${emp.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {emp.is_active ? 'Active' : 'Suspended'}
                  </span>
                </td>
                <td>
                  <button
                    className={`btn ${emp.is_active ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                    onClick={() => handleToggleActive(emp.employee_id, emp.is_active)}
                  >
                    {emp.is_active ? 'Deactivate Access' : 'Reactivate Access'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
