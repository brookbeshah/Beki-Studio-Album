import React, { useEffect, useState } from 'react';
import { Administrator, AdminPermissions, DEFAULT_ADMIN_PERMISSIONS } from '../types';
import {
  getAdministrators,
  createAdministrator,
  updateAdministrator,
  deleteAdministrator,
} from '../services/albumService';
import { Button } from '../components/common/Button';
import { RoleBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  ShieldCheck,
  UserPlus,
  Edit2,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Lock,
} from 'lucide-react';

export const AdminUsers: React.FC = () => {
  const { user, adminProfile, isSuperAdmin } = useAuth();
  const { success, error } = useToast();

  const [admins, setAdmins] = useState<Administrator[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Administrator | null>(null);
  const [adminToDelete, setAdminToDelete] = useState<Administrator | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [permissions, setPermissions] = useState<AdminPermissions>({ ...DEFAULT_ADMIN_PERMISSIONS });
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const list = await getAdministrators();
      setAdmins(list);
    } catch {
      console.error('Failed to load administrators');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setName('');
    setEmail('');
    setPermissions({ ...DEFAULT_ADMIN_PERMISSIONS });
    setStatus('ACTIVE');
    setShowAddModal(true);
  };

  const openEditModal = (adm: Administrator) => {
    setEditingAdmin(adm);
    setName(adm.name);
    setEmail(adm.email);
    setPermissions(adm.permissions || { ...DEFAULT_ADMIN_PERMISSIONS });
    setStatus(adm.status);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) {
      error('Name and email are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const actor = {
        id: user?.uid || 'admin',
        name: adminProfile?.name || "Beki's Studio Owner",
        email: adminProfile?.email || 'owner@bekisstudio.com',
      };

      await createAdministrator(
        {
          name: name.trim(),
          email: email.trim(),
          permissions,
        },
        actor
      );

      success('Administrator authorized successfully.');
      setShowAddModal(false);
      loadData();
    } catch {
      error('Failed to authorize administrator');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    setIsSubmitting(true);
    try {
      const actor = {
        id: user?.uid || 'admin',
        name: adminProfile?.name || "Beki's Studio Owner",
        email: adminProfile?.email || 'owner@bekisstudio.com',
      };

      await updateAdministrator(
        editingAdmin.id,
        {
          name: name.trim(),
          email: email.trim(),
          permissions,
          status,
        },
        actor
      );

      success('Administrator permissions updated.');
      setEditingAdmin(null);
      loadData();
    } catch {
      error('Failed to update administrator');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!adminToDelete) return;
    try {
      const actor = {
        id: user?.uid || 'admin',
        name: adminProfile?.name || "Beki's Studio Owner",
        email: adminProfile?.email || 'owner@bekisstudio.com',
      };

      await deleteAdministrator(adminToDelete.id, actor);
      success(`Revoked authorization for ${adminToDelete.email}`);
      setAdminToDelete(null);
      loadData();
    } catch (err: any) {
      error(err?.message || 'Failed to remove administrator');
    }
  };

  const togglePermission = (key: keyof AdminPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center py-24">
        <Lock className="w-10 h-10 text-[#C8A96B] mx-auto mb-3" />
        <h2 className="font-serif text-2xl text-[#171717] font-normal">Super Admin Area</h2>
        <p className="text-xs text-[#77736B] mt-1">
          Only the Beki's Studio Super Administrator can manage team accounts and privileges.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E0D0]">
        <div>
          <span className="text-[11px] uppercase tracking-[0.3em] text-[#C8A96B] font-medium">
            Access Control
          </span>
          <h2
            className="font-serif text-3xl text-[#171717] font-normal tracking-wide mt-0.5"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Administrators
          </h2>
          <p className="text-xs text-[#77736B] font-light mt-1">
            Authorized administrators with access to Beki's Studio operations.
          </p>
        </div>

        <Button
          variant="gold"
          size="md"
          onClick={openAddModal}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Add Administrator
        </Button>
      </div>

      {/* Info notice */}
      <div className="p-3.5 bg-[#FCFBF8] border border-[#E8E0D0] text-xs text-[#77736B] rounded-xs flex items-center justify-between">
        <span>
          <strong>Architecture Invariant:</strong> Exactly one Super Admin exists. All authorized administrators must authenticate via Google or Apple using their matching authorized email.
        </span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="py-20 text-center">
          <p className="text-xs tracking-widest uppercase text-[#77736B] animate-pulse">
            Loading Administrators...
          </p>
        </div>
      ) : (
        <div className="bg-[#FCFBF8] border border-[#E8E0D0] rounded-xs overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F6F0] text-[#77736B] uppercase tracking-wider text-[10px] border-b border-[#E8E0D0]">
                <tr>
                  <th className="py-3 px-4">Name & Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Permissions</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E0D0]">
                {admins.map((adm) => {
                  const isOwner = adm.role === 'SUPER_ADMIN';

                  return (
                    <tr key={adm.id} className="hover:bg-[#F8F6F0]/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-sm text-[#171717]">{adm.name}</div>
                        <div className="text-[11px] font-mono text-[#77736B]">{adm.email}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <RoleBadge role={adm.role} />
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] uppercase tracking-wider font-semibold border ${
                            adm.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-red-50 text-red-800 border-red-200'
                          }`}
                        >
                          {adm.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {isOwner ? (
                          <span className="text-[11px] text-[#A68542] font-semibold">
                            Full Master Privileges
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {adm.permissions?.createAlbums && (
                              <span className="px-1.5 py-0.5 bg-stone-100 text-[9px] rounded-xs text-stone-700">
                                Create
                              </span>
                            )}
                            {adm.permissions?.publishAlbums && (
                              <span className="px-1.5 py-0.5 bg-stone-100 text-[9px] rounded-xs text-stone-700">
                                Publish
                              </span>
                            )}
                            {adm.permissions?.uploadMedia && (
                              <span className="px-1.5 py-0.5 bg-stone-100 text-[9px] rounded-xs text-stone-700">
                                Upload
                              </span>
                            )}
                            {adm.permissions?.deleteMedia && (
                              <span className="px-1.5 py-0.5 bg-stone-100 text-[9px] rounded-xs text-stone-700">
                                Delete
                              </span>
                            )}
                            {adm.permissions?.generateQRCode && (
                              <span className="px-1.5 py-0.5 bg-stone-100 text-[9px] rounded-xs text-stone-700">
                                QR
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-[#77736B] text-[11px] font-mono">
                        {adm.lastLoginAt ? new Date(adm.lastLoginAt).toLocaleDateString() : 'Never'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {!isOwner ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(adm)}
                              className="p-1.5 text-[#77736B] hover:text-[#171717] hover:bg-[#EFECE4] rounded-xs transition-colors cursor-pointer"
                              title="Edit permissions"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setAdminToDelete(adm)}
                              className="p-1.5 text-[#77736B] hover:text-red-700 hover:bg-red-50 rounded-xs transition-colors cursor-pointer"
                              title="Remove administrator"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wider text-[#A8A49C] italic">
                            Protected
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Administrator Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Administrator"
        subtitle="Authorize an email address with custom operational privileges"
        maxWidth="xl"
      >
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Abebe Bekele"
                required
                className="w-full px-3 py-2 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-xs text-[#171717] focus:outline-none focus:border-[#C8A96B]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                Authorized Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="abebe@example.com"
                required
                className="w-full px-3 py-2 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-xs text-[#171717] focus:outline-none focus:border-[#C8A96B]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#77736B] mb-1 font-medium">
              Role
            </label>
            <input
              type="text"
              disabled
              value="ADMIN (Only one Super Admin exists)"
              className="w-full px-3 py-2 bg-[#EFECE4] border border-[#E8E0D0] rounded-xs text-xs text-[#77736B] cursor-not-allowed"
            />
          </div>

          {/* Granular Permissions Section */}
          <div className="border border-[#E8E0D0] p-4 rounded-xs bg-[#F8F6F0] space-y-4">
            <span className="block text-xs uppercase tracking-wider text-[#171717] font-semibold">
              Admin Permissions
            </span>

            <div className="space-y-3 text-xs">
              <div>
                <p className="font-semibold text-[11px] uppercase tracking-wider text-[#C8A96B] mb-1.5">
                  Album Management
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.createAlbums}
                      onChange={() => togglePermission('createAlbums')}
                      className="rounded-xs text-[#C8A96B]"
                    />
                    <span>Create Albums</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.editAlbums}
                      onChange={() => togglePermission('editAlbums')}
                      className="rounded-xs text-[#C8A96B]"
                    />
                    <span>Edit Albums</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.publishAlbums}
                      onChange={() => togglePermission('publishAlbums')}
                      className="rounded-xs text-[#C8A96B]"
                    />
                    <span>Publish Albums</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.unpublishAlbums}
                      onChange={() => togglePermission('unpublishAlbums')}
                      className="rounded-xs text-[#C8A96B]"
                    />
                    <span>Unpublish Albums</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E8E0D0]">
                <p className="font-semibold text-[11px] uppercase tracking-wider text-[#C8A96B] mb-1.5">
                  Media Management
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.uploadMedia}
                      onChange={() => togglePermission('uploadMedia')}
                      className="rounded-xs text-[#C8A96B]"
                    />
                    <span>Upload Media</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.deleteMedia}
                      onChange={() => togglePermission('deleteMedia')}
                      className="rounded-xs text-[#C8A96B]"
                    />
                    <span>Delete Media</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.reorderMedia}
                      onChange={() => togglePermission('reorderMedia')}
                      className="rounded-xs text-[#C8A96B]"
                    />
                    <span>Reorder Media</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E8E0D0]">
                <p className="font-semibold text-[11px] uppercase tracking-wider text-[#C8A96B] mb-1.5">
                  Album Tools
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.generateQRCode}
                      onChange={() => togglePermission('generateQRCode')}
                      className="rounded-xs text-[#C8A96B]"
                    />
                    <span>Generate QR Codes</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E8E0D0]">
            <Button variant="ghost" size="sm" type="button" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="gold" size="sm" type="submit" isLoading={isSubmitting}>
              Authorize Administrator
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Administrator Modal */}
      {editingAdmin && (
        <Modal
          isOpen={!!editingAdmin}
          onClose={() => setEditingAdmin(null)}
          title={`Edit ${editingAdmin.name}`}
          subtitle="Modify account permissions and status"
          maxWidth="xl"
        >
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-xs text-[#171717] focus:outline-none focus:border-[#C8A96B]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                  Authorized Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-xs text-[#171717] focus:outline-none focus:border-[#C8A96B]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                Account Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-xs text-[#171717]"
              >
                <option value="ACTIVE">ACTIVE (Authorized to enter)</option>
                <option value="INACTIVE">INACTIVE (Deactivated / Locked out)</option>
              </select>
            </div>

            {/* Granular Permissions Section */}
            <div className="border border-[#E8E0D0] p-4 rounded-xs bg-[#F8F6F0] space-y-4">
              <span className="block text-xs uppercase tracking-wider text-[#171717] font-semibold">
                Permissions for {editingAdmin.name}
              </span>

              <div className="space-y-3 text-xs">
                <div>
                  <p className="font-semibold text-[11px] uppercase tracking-wider text-[#C8A96B] mb-1.5">
                    Album Management
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.createAlbums}
                        onChange={() => togglePermission('createAlbums')}
                        className="rounded-xs text-[#C8A96B]"
                      />
                      <span>Create Albums</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.editAlbums}
                        onChange={() => togglePermission('editAlbums')}
                        className="rounded-xs text-[#C8A96B]"
                      />
                      <span>Edit Albums</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.publishAlbums}
                        onChange={() => togglePermission('publishAlbums')}
                        className="rounded-xs text-[#C8A96B]"
                      />
                      <span>Publish Albums</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.unpublishAlbums}
                        onChange={() => togglePermission('unpublishAlbums')}
                        className="rounded-xs text-[#C8A96B]"
                      />
                      <span>Unpublish Albums</span>
                    </label>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E8E0D0]">
                  <p className="font-semibold text-[11px] uppercase tracking-wider text-[#C8A96B] mb-1.5">
                    Media Management
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.uploadMedia}
                        onChange={() => togglePermission('uploadMedia')}
                        className="rounded-xs text-[#C8A96B]"
                      />
                      <span>Upload Media</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.deleteMedia}
                        onChange={() => togglePermission('deleteMedia')}
                        className="rounded-xs text-[#C8A96B]"
                      />
                      <span>Delete Media</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.reorderMedia}
                        onChange={() => togglePermission('reorderMedia')}
                        className="rounded-xs text-[#C8A96B]"
                      />
                      <span>Reorder Media</span>
                    </label>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E8E0D0]">
                  <p className="font-semibold text-[11px] uppercase tracking-wider text-[#C8A96B] mb-1.5">
                    Album Tools
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.generateQRCode}
                        onChange={() => togglePermission('generateQRCode')}
                        className="rounded-xs text-[#C8A96B]"
                      />
                      <span>Generate QR Codes</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E8E0D0]">
              <Button variant="ghost" size="sm" type="button" onClick={() => setEditingAdmin(null)}>
                Cancel
              </Button>
              <Button variant="gold" size="sm" type="submit" isLoading={isSubmitting}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Remove Confirmation */}
      {adminToDelete && (
        <ConfirmDialog
          isOpen={!!adminToDelete}
          onClose={() => setAdminToDelete(null)}
          onConfirm={handleDelete}
          title="Remove Administrator?"
          description={`Removing "${adminToDelete.name}" (${adminToDelete.email}) will immediately revoke their access to Beki's Studio.`}
          confirmLabel="Remove Administrator"
          isDestructive={true}
        />
      )}
    </div>
  );
};
