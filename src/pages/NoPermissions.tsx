import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function NoPermissions() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-16 w-16 text-amber-500" />
          </div>
          <CardTitle className="text-2xl">No Permissions</CardTitle>
          <CardDescription>
            You currently do not have access to any pages
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Your account <span className="font-semibold">{user?.username}</span> has been created, but no permissions have been assigned yet.
          </p>
          <p className="text-sm text-muted-foreground">
            Please contact your administrator to request access to the pages you need.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
