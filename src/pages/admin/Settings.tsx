import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, Activity, CheckCircle2, XCircle, RefreshCw, Database, FileText, Download, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
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

type LogEntry = {
  id: number;
  entryId: number;
  operationType: string;
  logTag: string;
  username: string;
  tradeDate: string;
  strategy: string;
  code: string;
  exchange: string;
  commodity: string;
  expiry: string;
  contractType: string;
  strikePrice: number;
  optionType: string;
  clientCode: string;
  broker: string;
  teamName: string;
  buyQty: number | null;
  buyAvg: number | null;
  sellQty: number | null;
  sellAvg: number | null;
  status: string;
  remark: string;
  tag: string;
  changedBy: string;
  changedAt: string;
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
  const [isConnectionVerified, setIsConnectionVerified] = useState(false);
  const isInitialLoad = useRef(true);

  // Current DB health status
  const [dbHealth, setDbHealth] = useState<{
    status: 'checking' | 'healthy' | 'unhealthy';
    message: string;
    database_type: string;
  }>({ status: 'checking', message: 'Checking...', database_type: '' });

  // Tab state for auto-refresh
  const [activeTab, setActiveTab] = useState('db-connection');

  // Log management state
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const [logFromDate, setLogFromDate] = useState(yesterday.toISOString().split('T')[0]);
  const [logToDate, setLogToDate] = useState(today.toISOString().split('T')[0]);
  const [isDownloadingLogs, setIsDownloadingLogs] = useState(false);
  const [isViewingLogs, setIsViewingLogs] = useState(false);
  const [logStatus, setLogStatus] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [logPage, setLogPage] = useState(1);
  const LOGS_PER_PAGE = 20;

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

  const checkDbHealth = async () => {
    setDbHealth(prev => ({ ...prev, status: 'checking' }));
    try {
      const response = await fetch(`${API_BASE_URL}/health/db`);
      const result = await response.json();

      setDbHealth({
        status: result.connected ? 'healthy' : 'unhealthy',
        message: result.message,
        database_type: result.database_type,
      });
    } catch (error) {
      setDbHealth({
        status: 'unhealthy',
        message: 'Failed to check database connection',
        database_type: '',
      });
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
        // Refresh DB health status after saving
        checkDbHealth();
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
    setIsConnectionVerified(false);

    try {
      // Build config from form values to test
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

      const response = await fetch(`${API_BASE_URL}/database/test-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(configData),
      });

      const result = await response.json();

      if (result.success && result.admin_exists) {
        setConnectionStatus(`✓ ${result.message}`);
        setIsConnectionVerified(true);
      } else if (result.success && !result.admin_exists) {
        setConnectionStatus(`⚠ ${result.message}`);
        setIsConnectionVerified(false);
      } else {
        setConnectionStatus(`✗ Connection failed: ${result.message}`);
        setIsConnectionVerified(false);
      }
    } catch (error) {
      setConnectionStatus(`✗ Error testing connection: ${error}`);
      setIsConnectionVerified(false);
    } finally {
      setIsTesting(false);
    }
  };

  useEffect(() => {
    checkAllApis();
    loadDatabaseConfig();
    checkDbHealth();
  }, []);

  // Reset connection verification when any config value changes (skip initial load)
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    setIsConnectionVerified(false);
    setConnectionStatus('');
  }, [dbConnection, sqlitePath, mssqlServer, mssqlDatabase, mssqlUsername, mssqlPassword, mssqlConnectionString]);

  // Auto-refresh DB health when switching to DB Connection tab
  useEffect(() => {
    if (activeTab === 'db-connection') {
      checkDbHealth();
    }
  }, [activeTab]);

  const downloadLogs = async () => {
    if (!logFromDate || !logToDate) {
      setLogStatus('Please select both From and To dates');
      return;
    }

    setIsDownloadingLogs(true);
    setLogStatus('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/logs/download?from_date=${logFromDate}&to_date=${logToDate}`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs_${logFromDate}_${logToDate}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setLogStatus('Download completed successfully!');
      } else {
        const error = await response.json();
        setLogStatus(`Error: ${error.detail}`);
      }
    } catch (error) {
      setLogStatus(`Error downloading logs: ${error}`);
    } finally {
      setIsDownloadingLogs(false);
    }
  };

  const viewLogs = async () => {
    if (!logFromDate || !logToDate) {
      setLogStatus('Please select both From and To dates');
      return;
    }

    setIsViewingLogs(true);
    setLogStatus('');
    setLogs([]);
    setShowLogs(false);
    setLogPage(1);

    try {
      const response = await fetch(
        `${API_BASE_URL}/logs?from_date=${logFromDate}&to_date=${logToDate}`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLogs(data);
        setShowLogs(true);
        if (data.length === 0) {
          setLogStatus('No logs found for the selected date range');
        }
      } else {
        const error = await response.json();
        setLogStatus(`Error: ${error.detail}`);
      }
    } catch (error) {
      setLogStatus(`Error fetching logs: ${error}`);
    } finally {
      setIsViewingLogs(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="db-connection">
            <Database className="h-4 w-4 mr-2" />
            DB Connection
          </TabsTrigger>
          <TabsTrigger value="api-status">
            <Activity className="h-4 w-4 mr-2" />
            API Status
          </TabsTrigger>
          <TabsTrigger value="log-management">
            <FileText className="h-4 w-4 mr-2" />
            Log Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="db-connection">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Database Connection</CardTitle>
                  <CardDescription>
                    Select the database connection type and provide connection details
                  </CardDescription>
                </div>
                {/* Current DB Connection Status */}
                <div
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium cursor-pointer hover:opacity-80 ${
                    dbHealth.status === 'checking' ? 'bg-blue-100 text-blue-700' :
                    dbHealth.status === 'healthy' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}
                  onClick={checkDbHealth}
                  title="Click to refresh"
                >
                  {dbHealth.status === 'checking' ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : dbHealth.status === 'healthy' ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {dbHealth.status === 'checking' ? 'Checking...' :
                   dbHealth.status === 'healthy' ? 'Connected' :
                   'Disconnected'}
                </div>
              </div>
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
                    <Button onClick={saveDatabaseConfig} disabled={isSaving || !isConnectionVerified}>
                      {isSaving ? 'Saving...' : 'Save Configuration'}
                    </Button>
                    <Button onClick={testDatabaseConnection} disabled={isTesting} variant="outline">
                      {isTesting ? 'Testing...' : 'Test Connection'}
                    </Button>
                  </div>
                  {!isConnectionVerified && !connectionStatus && (
                    <p className="text-sm text-muted-foreground">
                      Please test the connection before saving
                    </p>
                  )}
                  {connectionStatus && (
                    <p className={`text-sm ${connectionStatus.includes('✓') ? 'text-green-600' : connectionStatus.includes('⚠') ? 'text-yellow-600' : connectionStatus.includes('✗') ? 'text-red-600' : 'text-blue-600'}`}>
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
                    <Button onClick={saveDatabaseConfig} disabled={isSaving || !isConnectionVerified}>
                      {isSaving ? 'Saving...' : 'Save Configuration'}
                    </Button>
                    <Button onClick={testDatabaseConnection} disabled={isTesting} variant="outline">
                      {isTesting ? 'Testing...' : 'Test Connection'}
                    </Button>
                  </div>
                  {!isConnectionVerified && !connectionStatus && (
                    <p className="text-sm text-muted-foreground">
                      Please test the connection before saving
                    </p>
                  )}
                  {connectionStatus && (
                    <p className={`text-sm ${connectionStatus.includes('✓') ? 'text-green-600' : connectionStatus.includes('⚠') ? 'text-yellow-600' : connectionStatus.includes('✗') ? 'text-red-600' : 'text-blue-600'}`}>
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

        <TabsContent value="log-management">
          <Card>
            <CardHeader>
              <CardTitle>Log Management</CardTitle>
              <CardDescription>
                Download audit logs for trade entry changes (updates and deletes)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="log-from-date">From Date</Label>
                  <Input
                    id="log-from-date"
                    type="date"
                    value={logFromDate}
                    onChange={(e) => {
                      setLogFromDate(e.target.value);
                      setLogStatus('');
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="log-to-date">To Date</Label>
                  <Input
                    id="log-to-date"
                    type="date"
                    value={logToDate}
                    onChange={(e) => {
                      setLogToDate(e.target.value);
                      setLogStatus('');
                    }}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={viewLogs}
                  disabled={isViewingLogs || !logFromDate || !logToDate}
                  variant="outline"
                >
                  {isViewingLogs ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      View Logs
                    </>
                  )}
                </Button>
                <Button
                  onClick={downloadLogs}
                  disabled={isDownloadingLogs || !logFromDate || !logToDate}
                >
                  {isDownloadingLogs ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download Logs
                    </>
                  )}
                </Button>
              </div>

              {logStatus && (
                <p className={`text-sm ${
                  logStatus.includes('Error') ? 'text-red-600' :
                  logStatus.includes('No logs') ? 'text-yellow-600' :
                  logStatus.includes('completed') ? 'text-green-600' :
                  'text-muted-foreground'
                }`}>
                  {logStatus}
                </p>
              )}

              {showLogs && logs.length > 0 && (() => {
                const totalPages = Math.ceil(logs.length / LOGS_PER_PAGE);
                const startIndex = (logPage - 1) * LOGS_PER_PAGE;
                const endIndex = startIndex + LOGS_PER_PAGE;
                const paginatedLogs = logs.slice(startIndex, endIndex);

                return (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-4 py-2 border-b flex justify-between items-center">
                      <span className="text-sm font-medium">
                        Showing {startIndex + 1}-{Math.min(endIndex, logs.length)} of {logs.length} log entries
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowLogs(false)}
                      >
                        Hide
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="px-2 py-2 text-left font-medium">Changed At</th>
                            <th className="px-2 py-2 text-left font-medium">Operation</th>
                            <th className="px-2 py-2 text-left font-medium">Tag</th>
                            <th className="px-2 py-2 text-left font-medium">Entry ID</th>
                            <th className="px-2 py-2 text-left font-medium">Changed By</th>
                            <th className="px-2 py-2 text-left font-medium">Username</th>
                            <th className="px-2 py-2 text-left font-medium">Trade Date</th>
                            <th className="px-2 py-2 text-left font-medium">Strategy</th>
                            <th className="px-2 py-2 text-left font-medium">Code</th>
                            <th className="px-2 py-2 text-left font-medium">Exchange</th>
                            <th className="px-2 py-2 text-left font-medium">Commodity</th>
                            <th className="px-2 py-2 text-left font-medium">Buy Qty</th>
                            <th className="px-2 py-2 text-left font-medium">Buy Avg</th>
                            <th className="px-2 py-2 text-left font-medium">Sell Qty</th>
                            <th className="px-2 py-2 text-left font-medium">Sell Avg</th>
                            <th className="px-2 py-2 text-left font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedLogs.map((log) => (
                            <tr key={log.id} className="border-t hover:bg-slate-50">
                              <td className="px-2 py-1.5 whitespace-nowrap">{log.changedAt}</td>
                              <td className="px-2 py-1.5">
                                <span className={`px-1.5 py-0.5 rounded text-xs ${
                                  log.operationType === 'DELETE' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {log.operationType}
                                </span>
                              </td>
                              <td className="px-2 py-1.5">
                                <span className={`px-1.5 py-0.5 rounded text-xs ${
                                  log.logTag === 'before' ? 'bg-yellow-100 text-yellow-700' :
                                  log.logTag === 'after' ? 'bg-green-100 text-green-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {log.logTag}
                                </span>
                              </td>
                              <td className="px-2 py-1.5">{log.entryId}</td>
                              <td className="px-2 py-1.5">{log.changedBy}</td>
                              <td className="px-2 py-1.5">{log.username}</td>
                              <td className="px-2 py-1.5">{log.tradeDate}</td>
                              <td className="px-2 py-1.5">{log.strategy}</td>
                              <td className="px-2 py-1.5">{log.code}</td>
                              <td className="px-2 py-1.5">{log.exchange}</td>
                              <td className="px-2 py-1.5">{log.commodity}</td>
                              <td className="px-2 py-1.5">{log.buyQty ?? '-'}</td>
                              <td className="px-2 py-1.5">{log.buyAvg ?? '-'}</td>
                              <td className="px-2 py-1.5">{log.sellQty ?? '-'}</td>
                              <td className="px-2 py-1.5">{log.sellAvg ?? '-'}</td>
                              <td className="px-2 py-1.5">{log.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {totalPages > 1 && (
                      <div className="bg-slate-50 px-4 py-2 border-t flex justify-between items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLogPage(p => Math.max(1, p - 1))}
                          disabled={logPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {logPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLogPage(p => Math.min(totalPages, p + 1))}
                          disabled={logPage === totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="text-xs text-muted-foreground border-t pt-4">
                <p className="font-medium mb-1">Log Information:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Logs track all UPDATE and DELETE operations on trade entries</li>
                  <li>Each log includes the before/after state of the entry</li>
                  <li>Downloaded file will be in CSV format</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
