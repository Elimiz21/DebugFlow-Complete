import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Shield, 
  Settings, 
  Trash2, 
  Search, 
  Filter,
  ChevronDown,
  Crown,
  User,
  Eye,
  Code,
  MoreVertical,
  AlertCircle,
  Check,
  X
} from 'lucide-react';
import organizationService from '../../services/OrganizationService.js';
import toast from 'react-hot-toast';

const MembersManagement = ({ organizationId, currentUserRole }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Invite form state
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'viewer',
    teamId: null
  });
  const [isInviting, setIsInviting] = useState(false);

  const roles = [
    { 
      value: 'owner', 
      label: 'Owner', 
      icon: Crown, 
      color: 'text-yellow-400',
      description: 'Full access to all organization settings and data'
    },
    { 
      value: 'admin', 
      label: 'Admin', 
      icon: Shield, 
      color: 'text-red-400',
      description: 'Can manage members, teams, and organization settings'
    },
    { 
      value: 'developer', 
      label: 'Developer', 
      icon: Code, 
      color: 'text-blue-400',
      description: 'Can access and modify projects and collaborate'
    },
    { 
      value: 'viewer', 
      label: 'Viewer', 
      icon: Eye, 
      color: 'text-green-400',
      description: 'Read-only access to projects and data'
    }
  ];

  useEffect(() => {
    fetchMembers();
  }, [organizationId]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await organizationService.getOrganizationMembers(organizationId);
      setMembers(data);
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    
    if (!inviteForm.email.trim()) {
      toast.error('Email is required');
      return;
    }

    setIsInviting(true);
    try {
      await organizationService.inviteMember(
        organizationId, 
        inviteForm.email, 
        inviteForm.role,
        inviteForm.teamId
      );
      
      toast.success('Invitation sent successfully!');
      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'viewer', teamId: null });
      fetchMembers(); // Refresh the list
    } catch (error) {
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateRole = async (memberId, newRole) => {
    try {
      await organizationService.updateMemberRole(organizationId, memberId, newRole);
      toast.success('Member role updated successfully');
      setShowRoleModal(false);
      setSelectedMember(null);
      fetchMembers();
    } catch (error) {
      toast.error(error.message || 'Failed to update member role');
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the organization?`)) {
      return;
    }

    try {
      await organizationService.removeMember(organizationId, memberId);
      toast.success('Member removed successfully');
      fetchMembers();
    } catch (error) {
      toast.error(error.message || 'Failed to remove member');
    }
  };

  const getRoleInfo = (role) => {
    return roles.find(r => r.value === role) || roles[3]; // Default to viewer
  };

  const canManageMembers = organizationService.canManageMembers(currentUserRole);
  const canManageRole = (targetRole) => {
    const hierarchy = organizationService.getRoleHierarchy();
    return hierarchy[currentUserRole] > hierarchy[targetRole] || currentUserRole === 'owner';
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || member.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-6"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 mb-4">
              <div className="h-10 w-10 bg-gray-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-1/4"></div>
              </div>
              <div className="h-6 bg-gray-700 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Failed to Load Members</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchMembers}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Users className="w-6 h-6 text-blue-400 mr-2" />
            <h2 className="text-xl font-semibold text-white">
              Members ({members.length})
            </h2>
          </div>
          
          {canManageMembers && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Member
            </button>
          )}
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search members..."
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="pl-10 pr-8 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Roles</option>
              {roles.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="p-6">
        {filteredMembers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">
              {searchTerm || filterRole !== 'all' ? 'No matching members' : 'No members found'}
            </h3>
            <p className="text-gray-500">
              {searchTerm || filterRole !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Invite team members to get started'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMembers.map((member) => {
              const roleInfo = getRoleInfo(member.role);
              const RoleIcon = roleInfo.icon;
              
              return (
                <div key={member.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-300" />
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-white">{member.name}</h3>
                        {member.status === 'pending' && (
                          <span className="px-2 py-1 text-xs bg-yellow-900 text-yellow-300 rounded-full">
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{member.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Role Badge */}
                    <div className="flex items-center space-x-2">
                      <RoleIcon className={`w-4 h-4 ${roleInfo.color}`} />
                      <span className="text-sm text-gray-300 font-medium">
                        {roleInfo.label}
                      </span>
                    </div>

                    {/* Actions */}
                    {canManageMembers && member.role !== 'owner' && (
                      <div className="flex items-center space-x-2">
                        {canManageRole(member.role) && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedMember(member);
                                setShowRoleModal(true);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-600 rounded-md transition-colors"
                              title="Change Role"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => handleRemoveMember(member.id, member.name)}
                              className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded-md transition-colors"
                              title="Remove Member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={() => setShowInviteModal(false)}></div>

            <div className="inline-block w-full max-w-md my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-800 shadow-xl rounded-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                <h3 className="text-lg font-medium text-white flex items-center">
                  <Mail className="w-5 h-5 mr-2 text-blue-400" />
                  Invite Member
                </h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleInviteMember} className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
                    placeholder="user@example.com"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Role
                  </label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
                  >
                    {roles.filter(role => role.value !== 'owner').map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-sm text-gray-400">
                    {getRoleInfo(inviteForm.role).description}
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isInviting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isInviting ? 'Inviting...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {showRoleModal && selectedMember && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={() => setShowRoleModal(false)}></div>

            <div className="inline-block w-full max-w-md my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-800 shadow-xl rounded-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                <h3 className="text-lg font-medium text-white">
                  Change Role for {selectedMember.name}
                </h3>
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                <div className="space-y-3">
                  {roles.filter(role => role.value !== 'owner' || currentUserRole === 'owner').map(role => {
                    const RoleIcon = role.icon;
                    const isCurrentRole = selectedMember.role === role.value;
                    
                    return (
                      <div
                        key={role.value}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          isCurrentRole 
                            ? 'border-blue-500 bg-blue-900 bg-opacity-20' 
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                        onClick={() => !isCurrentRole && handleUpdateRole(selectedMember.id, role.value)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <RoleIcon className={`w-5 h-5 ${role.color}`} />
                            <div>
                              <div className="font-medium text-white">{role.label}</div>
                              <div className="text-sm text-gray-400">{role.description}</div>
                            </div>
                          </div>
                          {isCurrentRole && (
                            <Check className="w-5 h-5 text-blue-400" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowRoleModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembersManagement;