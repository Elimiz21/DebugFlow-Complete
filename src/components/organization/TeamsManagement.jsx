import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Settings, 
  Trash2, 
  UserPlus, 
  UserMinus,
  Edit,
  Save,
  X,
  AlertCircle,
  User,
  FolderOpen,
  Code,
  Target,
  Calendar
} from 'lucide-react';
import organizationService from '../../services/OrganizationService.js';
import toast from 'react-hot-toast';

const TeamsManagement = ({ organizationId, currentUserRole }) => {
  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);

  // Create team form state
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    type: 'development'
  });
  const [isCreating, setIsCreating] = useState(false);

  const teamColors = [
    { value: '#3B82F6', label: 'Blue' },
    { value: '#10B981', label: 'Green' },
    { value: '#F59E0B', label: 'Yellow' },
    { value: '#EF4444', label: 'Red' },
    { value: '#8B5CF6', label: 'Purple' },
    { value: '#06B6D4', label: 'Cyan' },
    { value: '#EC4899', label: 'Pink' },
    { value: '#6B7280', label: 'Gray' }
  ];

  const teamTypes = [
    { value: 'development', label: 'Development', icon: Code, description: 'Software development team' },
    { value: 'design', label: 'Design', icon: Target, description: 'UI/UX and visual design team' },
    { value: 'qa', label: 'QA/Testing', icon: Search, description: 'Quality assurance and testing team' },
    { value: 'project', label: 'Project Management', icon: Calendar, description: 'Project coordination and management' },
    { value: 'other', label: 'Other', icon: FolderOpen, description: 'General purpose team' }
  ];

  useEffect(() => {
    if (organizationId) {
      fetchData();
    }
  }, [organizationId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [teamsData, membersData] = await Promise.all([
        organizationService.getTeams(organizationId),
        organizationService.getOrganizationMembers(organizationId)
      ]);
      setTeams(teamsData);
      setMembers(membersData);
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    
    if (!createForm.name.trim()) {
      toast.error('Team name is required');
      return;
    }

    setIsCreating(true);
    try {
      const teamData = {
        ...createForm,
        organization_id: organizationId
      };

      await organizationService.createTeam(teamData);
      toast.success('Team created successfully!');
      setShowCreateModal(false);
      setCreateForm({ name: '', description: '', color: '#3B82F6', type: 'development' });
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to create team');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateTeam = async (teamId, updates) => {
    try {
      await organizationService.updateTeam(teamId, updates);
      toast.success('Team updated successfully');
      setEditingTeam(null);
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to update team');
    }
  };

  const handleDeleteTeam = async (team) => {
    if (!confirm(`Are you sure you want to delete the team "${team.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await organizationService.deleteTeam(team.id);
      toast.success('Team deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to delete team');
    }
  };

  const handleAddMember = async (teamId, userId) => {
    try {
      await organizationService.addTeamMember(teamId, userId);
      toast.success('Member added to team');
      fetchData();
      if (selectedTeam && selectedTeam.id === teamId) {
        const updatedTeam = await organizationService.getTeam(teamId);
        setSelectedTeam(updatedTeam);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to add member to team');
    }
  };

  const handleRemoveMember = async (teamId, userId, memberName) => {
    if (!confirm(`Remove ${memberName} from this team?`)) {
      return;
    }

    try {
      await organizationService.removeTeamMember(teamId, userId);
      toast.success('Member removed from team');
      fetchData();
      if (selectedTeam && selectedTeam.id === teamId) {
        const updatedTeam = await organizationService.getTeam(teamId);
        setSelectedTeam(updatedTeam);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to remove member from team');
    }
  };

  const canManageTeams = organizationService.canManageTeams(currentUserRole);

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeInfo = (type) => {
    return teamTypes.find(t => t.value === type) || teamTypes[0];
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-700 rounded-lg p-4">
                <div className="h-4 bg-gray-600 rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-gray-600 rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="h-3 bg-gray-600 rounded w-full"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Failed to Load Teams</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchData}
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
              Teams ({teams.length})
            </h2>
          </div>
          
          {canManageTeams && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Team
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search teams..."
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Teams Grid */}
      <div className="p-6">
        {filteredTeams.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">
              {searchTerm ? 'No matching teams' : 'No teams found'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm 
                ? 'Try adjusting your search criteria'
                : 'Create your first team to organize your members'
              }
            </p>
            {!searchTerm && canManageTeams && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Create First Team
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.map((team) => {
              const typeInfo = getTypeInfo(team.type);
              const TypeIcon = typeInfo.icon;
              
              return (
                <div
                  key={team.id}
                  className="bg-gray-700 rounded-lg p-6 hover:bg-gray-650 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedTeam(team);
                    setShowTeamModal(true);
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                        style={{ backgroundColor: team.color }}
                      ></div>
                      <div className="min-w-0 flex-1">
                        {editingTeam === team.id ? (
                          <input
                            type="text"
                            defaultValue={team.name}
                            className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-lg font-semibold"
                            onBlur={(e) => {
                              if (e.target.value !== team.name) {
                                handleUpdateTeam(team.id, { name: e.target.value });
                              } else {
                                setEditingTeam(null);
                              }
                            }}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.target.blur();
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <h3 className="text-lg font-semibold text-white truncate">
                            {team.name}
                          </h3>
                        )}
                      </div>
                    </div>

                    {canManageTeams && (
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTeam(team.id);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-400 hover:bg-gray-600 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTeam(team);
                          }}
                          className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 mb-3">
                    <TypeIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-400">{typeInfo.label}</span>
                  </div>

                  {team.description && (
                    <p className="text-sm text-gray-300 mb-4 line-clamp-2">
                      {team.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-400">
                        {team.members?.length || 0} members
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      Created {new Date(team.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={() => setShowCreateModal(false)}></div>

            <div className="inline-block w-full max-w-md my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-800 shadow-xl rounded-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                <h3 className="text-lg font-medium text-white flex items-center">
                  <Plus className="w-5 h-5 mr-2 text-blue-400" />
                  Create Team
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateTeam} className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Team Name
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Frontend Development"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brief description of the team's purpose..."
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Team Type
                  </label>
                  <select
                    value={createForm.type}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
                  >
                    {teamTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Team Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {teamColors.map(color => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setCreateForm(prev => ({ ...prev, color: color.value }))}
                        className={`w-8 h-8 rounded-full border-2 ${
                          createForm.color === color.value ? 'border-white' : 'border-gray-600'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isCreating ? 'Creating...' : 'Create Team'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Team Details Modal */}
      {showTeamModal && selectedTeam && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={() => setShowTeamModal(false)}></div>

            <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-800 shadow-xl rounded-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: selectedTeam.color }}
                  ></div>
                  <h3 className="text-lg font-medium text-white">
                    {selectedTeam.name}
                  </h3>
                </div>
                <button
                  onClick={() => setShowTeamModal(false)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                {selectedTeam.description && (
                  <p className="text-gray-300 mb-6">{selectedTeam.description}</p>
                )}

                {/* Team Members */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-medium text-white">
                      Members ({selectedTeam.members?.length || 0})
                    </h4>
                    {canManageTeams && (
                      <div className="text-sm">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAddMember(selectedTeam.id, parseInt(e.target.value));
                              e.target.value = '';
                            }
                          }}
                          className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        >
                          <option value="">Add member...</option>
                          {members
                            .filter(member => !selectedTeam.members?.find(tm => tm.id === member.id))
                            .map(member => (
                              <option key={member.id} value={member.id}>
                                {member.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {selectedTeam.members?.length > 0 ? (
                    <div className="space-y-2">
                      {selectedTeam.members.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-300" />
                            </div>
                            <div>
                              <div className="font-medium text-white">{member.name}</div>
                              <div className="text-sm text-gray-400">{member.email}</div>
                            </div>
                          </div>
                          
                          {canManageTeams && (
                            <button
                              onClick={() => handleRemoveMember(selectedTeam.id, member.id, member.name)}
                              className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded-md transition-colors"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No members in this team yet</p>
                    </div>
                  )}
                </div>

                {/* Team Stats */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {selectedTeam.members?.length || 0}
                    </div>
                    <div className="text-sm text-gray-400">Members</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {getTypeInfo(selectedTeam.type).label}
                    </div>
                    <div className="text-sm text-gray-400">Team Type</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamsManagement;