import { useState, useEffect } from 'react';
import { userAPI } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';

type User = {
  id: number;
  username: string;
  role: string;
  permissions?: string[];
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

const AVAILABLE_PAGES = [
  { key: 'trade-entry', label: 'Trade Entry' },
  { key: 'manual-trade-entry', label: 'Manual Trade Entry' },
  { key: 'masters', label: 'Masters' },
  { key: 'settings', label: 'Settings' },
  { key: 'user-management', label: 'User Management' },
];

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create User Dialog State
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Reset Password Dialog State
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  // Delete User Dialog State
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [deleteUsername, setDeleteUsername] = useState('');

  // Permissions Dialog State
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [permissionsUserId, setPermissionsUserId] = useState<number | null>(null);
  const [permissionsUsername, setPermissionsUsername] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Unified loading state for all dialogs
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUsers = async () => {
    try {
      setError('');
      const data = await userAPI.getAll();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Auto-dismiss success messages after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Generic handler wrapper for dialog submissions
  const handleDialogSubmit = async (
    apiCall: () => Promise<void>,
    successMessage: string,
    closeHandler: () => void
  ) => {
    setIsSubmitting(true);
    setError('');

    try {
      await apiCall();
      setSuccess(successMessage);
      closeHandler();
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUsername || !newPassword) {
      setError('Username and password are required');
      return;
    }

    await handleDialogSubmit(
      () => userAPI.create(newUsername, newPassword),
      'User created successfully',
      closeCreateDialog
    );
  };

  const handleResetPassword = async () => {
    if (!resetUserId || !resetPassword) {
      setError('Password is required');
      return;
    }

    await handleDialogSubmit(
      () => userAPI.resetPassword(resetUserId, resetPassword),
      'Password reset successfully',
      closeResetDialog
    );
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    await handleDialogSubmit(
      () => userAPI.delete(deleteUserId),
      'User deleted successfully',
      closeDeleteDialog
    );
  };

  // Dialog close handlers with state cleanup
  const closeCreateDialog = () => {
    setShowCreateDialog(false);
    setNewUsername('');
    setNewPassword('');
  };

  const closeResetDialog = () => {
    setShowResetDialog(false);
    setResetUserId(null);
    setResetPassword('');
  };

  const closeDeleteDialog = () => {
    setShowDeleteDialog(false);
    setDeleteUserId(null);
    setDeleteUsername('');
  };

  const closePermissionsDialog = () => {
    setShowPermissionsDialog(false);
    setPermissionsUserId(null);
    setPermissionsUsername('');
    setSelectedPermissions([]);
  };

  // Dialog open handlers
  const openResetDialog = (userId: number) => {
    setResetUserId(userId);
    setResetPassword('');
    setShowResetDialog(true);
  };

  const openDeleteDialog = (userId: number, username: string) => {
    setDeleteUserId(userId);
    setDeleteUsername(username);
    setShowDeleteDialog(true);
  };

  const openPermissionsDialog = (user: User) => {
    setPermissionsUserId(user.id);
    setPermissionsUsername(user.username);
    setSelectedPermissions(user.permissions || []);
    setShowPermissionsDialog(true);
  };

  const handleUpdatePermissions = async () => {
    if (!permissionsUserId) return;

    await handleDialogSubmit(
      () => userAPI.updatePermissions(permissionsUserId, selectedPermissions),
      'Permissions updated successfully',
      closePermissionsDialog
    );
  };

  const togglePermission = (pageKey: string) => {
    setSelectedPermissions(prev =>
      prev.includes(pageKey)
        ? prev.filter(p => p !== pageKey)
        : [...prev, pageKey]
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Button onClick={() => setShowCreateDialog(true)}>Create New User</Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No users found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          user.role === 'admin'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(user.lastLogin)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {user.role !== 'admin' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPermissionsDialog(user)}
                          >
                            Manage Permissions
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openResetDialog(user.id)}
                        >
                          Reset Password
                        </Button>
                        {user.role !== 'admin' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openDeleteDialog(user.id, user.username)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => !open && closeCreateDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Enter the username and password for the new user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-username">Username</Label>
              <Input
                id="new-username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter username"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateUser()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter password"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateUser()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCreateDialog}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showResetDialog} onOpenChange={(open) => !open && closeResetDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter a new password for this user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reset-password">New Password</Label>
              <Input
                id="reset-password"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Enter new password"
                onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeResetDialog}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={isSubmitting}>
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete user "{deleteUsername}"? This action cannot be
              undone and the user will be immediately logged out.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteDialog}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={(open) => !open && closePermissionsDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Permissions for {permissionsUsername}</DialogTitle>
            <DialogDescription>
              Select which pages this user can access. Admin users have access to all pages.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {AVAILABLE_PAGES.map((page) => (
              <div key={page.key} className="flex items-center space-x-2">
                <Checkbox
                  id={page.key}
                  checked={selectedPermissions.includes(page.key)}
                  onCheckedChange={() => togglePermission(page.key)}
                />
                <Label
                  htmlFor={page.key}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {page.label}
                </Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closePermissionsDialog}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePermissions} disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Permissions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
