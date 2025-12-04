import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, Activity, CheckCircle2, XCircle, RefreshCw, Database } from 'lucide-react';
import { API_BASE_URL } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type ApiEndpoint = {
  name: string;
  endpoint: string;
  method: string;
  requiresAuth: boolean;
};

type ApiStatus = {
  name: string;
  endpoint: string;
  status: 'checking' | 'success' | 'error';
  responseTime?: number;
  statusCode?: number;
  error?: string;
};

const API_ENDPOINTS: ApiEndpoint[] = [
  // General
  { name: 'Health Check', endpoint: '/health', method: 'GET', requiresAuth: false },

  // Trade Entries
  { name: 'Get All Trade Entries', endpoint: '/trade-entries', method: 'GET', requiresAuth: true },
  { name: 'Get Trade Entries by Date', endpoint: `/trade-entries/date/${new Date().toISOString().split('T')[0]}`, method: 'GET', requiresAuth: true },

  // Masters
  { name: 'Get All Masters', endpoint: '/masters', method: 'GET', requiresAuth: false },
  { name: 'Get Master Category - Strategy', endpoint: '/masters/Strategy', method: 'GET', requiresAuth: false },
  { name: 'Get Master Category - Code', endpoint: '/masters/Code', method: 'GET', requiresAuth: false },
  { name: 'Get Master Category - Exchange', endpoint: '/masters/Exchange', method: 'GET', requiresAuth: false },
  { name: 'Get Master Category - Commodity', endpoint: '/masters/Commodity', method: 'GET', requiresAuth: false },
  { name: 'Get Master Category - Broker', endpoint: '/masters/Broker', method: 'GET', requiresAuth: false },
  { name: 'Get Master Category - Status', endpoint: '/masters/Status', method: 'GET', requiresAuth: false },

  // Mappings
  { name: 'Get Strategy-Code Mappings', endpoint: '/mappings/strategy-code', method: 'GET', requiresAuth: false },
  { name: 'Get Code-Exchange Mappings', endpoint: '/mappings/code-exchange', method: 'GET', requiresAuth: false },
  { name: 'Get Exchange-Commodity Mappings', endpoint: '/mappings/exchange-commodity', method: 'GET', requiresAuth: false },

  // Cascading Dropdowns (using ID 1 as test)
  { name: 'Get Codes by Strategy', endpoint: '/cascading/codes/1', method: 'GET', requiresAuth: false },
  { name: 'Get Exchanges by Code', endpoint: '/cascading/exchanges/1', method: 'GET', requiresAuth: false },
  { name: 'Get Commodities by Exchange', endpoint: '/cascading/commodities/1', method: 'GET', requiresAuth: false },

  // Authentication
  { name: 'Validate Auth', endpoint: '/auth/validate', method: 'GET', requiresAuth: true },
  { name: 'Get Session', endpoint: '/session', method: 'GET', requiresAuth: true },

  // User Management
  { name: 'Get All Users', endpoint: '/users', method: 'GET', requiresAuth: true },
];

export function Settings() {
  const { token } = useAuth();
  const [apiStatuses, setApiStatuses] = useState<ApiStatus[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [dbConnection, setDbConnection] = useState<'sqlite' | 'mssql'>('sqlite');

  // SQLite settings
  const [sqlitePath, setSqlitePath] = useState('');

  // MS SQL settings
  const [mssqlServer, setMssqlServer] = useState('');
  const [mssqlDatabase, setMssqlDatabase] = useState('');
  const [mssqlUsername, setMssqlUsername] = useState('');
  const [mssqlPassword, setMssqlPassword] = useState('');
  const [mssqlConnectionString, setMssqlConnectionString] = useState('');
  const [useConnectionString, setUseConnectionString] = useState(false);

  // Connection status
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const checkApiStatus = async (api: ApiEndpoint): Promise<ApiStatus> => {
    const startTime = Date.now();
    try {
      const headers: HeadersInit = {};
      if (api.requiresAuth && token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}${api.endpoint}`, {
        method: api.method,
        headers,
      });

      const responseTime = Date.now() - startTime;

      return {
        name: api.name,
        endpoint: api.endpoint,
        status: response.ok ? 'success' : 'error',
        responseTime,
        statusCode: response.status,
      };
    } catch (error) {
      return {
        name: api.name,
        endpoint: api.endpoint,
        status: 'error',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  const checkAllApis = async () => {
    setIsChecking(true);
    setApiStatuses(
      API_ENDPOINTS.map(api => ({
        name: api.name,
        endpoint: api.endpoint,
        status: 'checking' as const,
      }))
    );

    const results = await Promise.all(
      API_ENDPOINTS.map(api => checkApiStatus(api))
    );

    setApiStatuses(results);
    setIsChecking(false);
  };

  const loadDatabaseConfig = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/database/config`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        const config = await response.json();
        setDbConnection(config.type);
        setSqlitePath(config.sqlite.path);
        setMssqlServer(config.mssql.server);
        setMssqlDatabase(config.mssql.database);
        setMssqlUsername(config.mssql.username);
        setMssqlPassword(config.mssql.password);
        setMssqlConnectionString(config.mssql.connection_string);
        setUseConnectionString(!!config.mssql.connection_string);
      }
    } catch (error) {
      console.error('Error loading database config:', error);
    }
  };

  const saveDatabaseConfig = async () => {
    setIsSaving(true);
    setConnectionStatus('');

    try {
      const configData = {
        type: dbConnection,
        sqlite: { path: sqlitePath },
        mssql: {
          server: mssqlServer,
          database: mssqlDatabase,
          username: mssqlUsername,
          password: mssqlPassword,
          connection_string: mssqlConnectionString,
        },
      };

      const response = await fetch(`${API_BASE_URL}/database/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(configData),
      });

      if (response.ok) {
        setConnectionStatus('Configuration saved successfully!');
      } else {
        const error = await response.json();
        setConnectionStatus(`Error: ${error.detail}`);
      }
    } catch (error) {
      setConnectionStatus(`Error saving configuration: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const testDatabaseConnection = async () => {
    setIsTesting(true);
    setConnectionStatus('');

    try {
      const response = await fetch(`${API_BASE_URL}/database/test`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const result = await response.json();

      if (result.success) {
        setConnectionStatus(`✓ ${result.message}`);
      } else {
        setConnectionStatus(`✗ Connection failed: ${result.message}`);
      }
    } catch (error) {
      setConnectionStatus(`✗ Error testing connection: ${error}`);
    } finally {
      setIsTesting(false);
    }
  };

  useEffect(() => {
    checkAllApis();
    loadDatabaseConfig();
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
      </div>

      <Tabs defaultValue="db-connection" className="w-full">
        <TabsList>
          <TabsTrigger value="db-connection">
            <Database className="h-4 w-4 mr-2" />
            DB Connection
          </TabsTrigger>
          <TabsTrigger value="api-status">
            <Activity className="h-4 w-4 mr-2" />
            API Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="db-connection">
          <Card>
            <CardHeader>
              <CardTitle>Database Connection</CardTitle>
              <CardDescription>
                Select the database connection type and provide connection details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup value={dbConnection} onValueChange={(value) => setDbConnection(value as 'sqlite' | 'mssql')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sqlite" id="sqlite" />
                  <Label htmlFor="sqlite" className="cursor-pointer">SQLite</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mssql" id="mssql" />
                  <Label htmlFor="mssql" className="cursor-pointer">MS SQL</Label>
                </div>
              </RadioGroup>

              {dbConnection === 'sqlite' && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="sqlite-path">Database File Path</Label>
                    <Input
                      id="sqlite-path"
                      value={sqlitePath}
                      onChange={(e) => setSqlitePath(e.target.value)}
                      placeholder="e.g., ./database.db or C:\path\to\database.db"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the path to your SQLite database file
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveDatabaseConfig} disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Configuration'}
                    </Button>
                    <Button onClick={testDatabaseConnection} disabled={isTesting} variant="outline">
                      {isTesting ? 'Testing...' : 'Test Connection'}
                    </Button>
                  </div>
                  {connectionStatus && (
                    <p className={`text-sm ${connectionStatus.includes('✓') ? 'text-green-600' : connectionStatus.includes('✗') ? 'text-red-600' : 'text-blue-600'}`}>
                      {connectionStatus}
                    </p>
                  )}
                </div>
              )}

              {dbConnection === 'mssql' && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center space-x-2 mb-4">
                    <input
                      type="checkbox"
                      id="use-connection-string"
                      checked={useConnectionString}
                      onChange={(e) => setUseConnectionString(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="use-connection-string" className="cursor-pointer">
                      Use Connection String
                    </Label>
                  </div>

                  {useConnectionString ? (
                    <div className="space-y-2">
                      <Label htmlFor="connection-string">Connection String</Label>
                      <Input
                        id="connection-string"
                        value={mssqlConnectionString}
                        onChange={(e) => setMssqlConnectionString(e.target.value)}
                        placeholder="Server=myServerAddress;Database=myDataBase;User Id=myUsername;Password=myPassword;"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the full MS SQL connection string
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="mssql-server">Server</Label>
                        <Input
                          id="mssql-server"
                          value={mssqlServer}
                          onChange={(e) => setMssqlServer(e.target.value)}
                          placeholder="e.g., localhost or 192.168.1.100"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mssql-database">Database Name</Label>
                        <Input
                          id="mssql-database"
                          value={mssqlDatabase}
                          onChange={(e) => setMssqlDatabase(e.target.value)}
                          placeholder="e.g., TraderDB"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mssql-username">Username</Label>
                        <Input
                          id="mssql-username"
                          value={mssqlUsername}
                          onChange={(e) => setMssqlUsername(e.target.value)}
                          placeholder="Database username"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mssql-password">Password</Label>
                        <Input
                          id="mssql-password"
                          type="password"
                          value={mssqlPassword}
                          onChange={(e) => setMssqlPassword(e.target.value)}
                          placeholder="Database password"
                        />
                      </div>
                    </>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={saveDatabaseConfig} disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Configuration'}
                    </Button>
                    <Button onClick={testDatabaseConnection} disabled={isTesting} variant="outline">
                      {isTesting ? 'Testing...' : 'Test Connection'}
                    </Button>
                  </div>
                  {connectionStatus && (
                    <p className={`text-sm ${connectionStatus.includes('✓') ? 'text-green-600' : connectionStatus.includes('✗') ? 'text-red-600' : 'text-blue-600'}`}>
                      {connectionStatus}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-status">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>API Status Monitor</CardTitle>
                  <CardDescription>
                    Real-time status of all backend API endpoints
                  </CardDescription>
                </div>
                <Button
                  onClick={checkAllApis}
                  disabled={isChecking}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
                  {isChecking ? 'Checking...' : 'Refresh'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {apiStatuses.map((api, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-3 py-2 rounded border bg-slate-50 hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {api.status === 'checking' && (
                        <RefreshCw className="h-4 w-4 animate-spin text-blue-500 flex-shrink-0" />
                      )}
                      {api.status === 'success' && (
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                      {api.status === 'error' && (
                        <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate">{api.name}</span>
                      <span className="text-xs text-muted-foreground truncate">({api.endpoint})</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs flex-shrink-0">
                      {api.statusCode && (
                        <span className={`px-1.5 py-0.5 rounded font-mono ${
                          api.status === 'success'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {api.statusCode}
                        </span>
                      )}
                      {api.responseTime !== undefined && (
                        <span className="text-muted-foreground w-12 text-right">
                          {api.responseTime}ms
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
