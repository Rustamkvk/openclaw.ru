import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactElement } from 'react'
import { Navigate, Route, Routes, useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import {
  AppBar, Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, Container,
  CssBaseline, Drawer, FormControlLabel, IconButton, List, ListItemButton, ListItemIcon, ListItemText,
  Paper, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  Tooltip, useMediaQuery,
  ThemeProvider, Toolbar, Typography, createTheme
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import PersonIcon from '@mui/icons-material/Person'
import HubIcon from '@mui/icons-material/Hub'
import GroupIcon from '@mui/icons-material/Group'
import HistoryIcon from '@mui/icons-material/History'
import TimelineIcon from '@mui/icons-material/Timeline'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import LogoutIcon from '@mui/icons-material/Logout'
import RefreshIcon from '@mui/icons-material/Refresh'
import MenuIcon from '@mui/icons-material/Menu'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import MemoryIcon from '@mui/icons-material/Memory'
import TaskIcon from '@mui/icons-material/Task'
import ForumIcon from '@mui/icons-material/Forum'
import GavelIcon from '@mui/icons-material/Gavel'
import {
  BarChart, Bar, CartesianGrid, LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis, Legend
} from 'recharts'

type User = { id: number; name: string; email: string; role: 'admin' | 'user' | null; is_active: boolean; last_login_at?: string | null }
type ActivityLog = { id: number; action: string; details?: string; created_at: string; user?: { name: string; email: string } | null }
type AgentNode = { id: number; name: string; status: string; last_seen_at: string | null; last_ip: string | null }

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
const api = axios.create({ baseURL: API_BASE_URL })
const tokenStorageKey = 'openclaw_token'
const drawerWidth = 260

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem(tokenStorageKey))
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('openclaw_theme') !== 'light')

  const theme = useMemo(() => createTheme({
    palette: darkMode
      ? { mode: 'dark', primary: { main: '#4f8cff' }, background: { default: '#0b1020', paper: '#121a2f' } }
      : { mode: 'light', primary: { main: '#1565c0' }, background: { default: '#f3f6fb', paper: '#ffffff' } },
    shape: { borderRadius: 12 },
  }), [darkMode])

  useEffect(() => {
    if (!token) { setUser(null); setLoading(false); return }
    api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setUser(res.data.user))
      .catch(() => { setToken(null); localStorage.removeItem(tokenStorageKey) })
      .finally(() => setLoading(false))
  }, [token])

  const context = useMemo(() => ({ token, setToken, user, setUser, setError }), [token, user])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {loading ? (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>
      ) : user ? (
        <Shell
          user={user}
          error={error}
          onClearError={() => setError(null)}
          onLogout={() => logout(context)}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        >
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard token={token} darkMode={darkMode} />} />
            <Route path="/profile" element={<ProfilePage context={context} />} />
            <Route path="/agents" element={<AgentPage />} />
            <Route path="/legacy/memory" element={<LegacyFramePage title="Legacy: Центр памяти" src="/legacy/control_center/development/memory_center.html" />} />
            <Route path="/legacy/tasks" element={<LegacyFramePage title="Legacy: Доска задач" src="/legacy/control_center/development/TASK_BOARD.md" />} />
            <Route path="/legacy/chat" element={<LegacyFramePage title="Legacy: Чат с Атласом" src="/legacy/control_center/development/index.html" />} />
            <Route path="/legacy/fz" element={<LegacyFramePage title="Legacy: 44-ФЗ обзор" src="/legacy/control_center/development/44-fz-workflow.md" />} />
            <Route path="/users" element={<AdminGuard user={user}><UsersPage token={token} /></AdminGuard>} />
            <Route path="/logs" element={<AdminGuard user={user}><LogsPage token={token} /></AdminGuard>} />
            <Route path="/logging" element={<AdminGuard user={user}><LoggingPage token={token} /></AdminGuard>} />
            <Route path="/metrics" element={<AdminGuard user={user}><MetricsPage token={token} /></AdminGuard>} />
          </Routes>
        </Shell>
      ) : (
        <LoginPage context={context} darkMode={darkMode} setDarkMode={setDarkMode} />
      )}
    </ThemeProvider>
  )
}

function Shell({ user, error, onClearError, onLogout, children, darkMode, setDarkMode }: { user: User; error: string | null; onClearError: () => void; onLogout: () => void; children: ReactElement; darkMode: boolean; setDarkMode: (v: boolean) => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const mobile = useMediaQuery('(max-width:900px)')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const menu = [
    { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
    { label: 'Профиль', path: '/profile', icon: <PersonIcon /> },
    { label: 'Агенты', path: '/agents', icon: <HubIcon /> },
    { label: 'Legacy: Память', path: '/legacy/memory', icon: <MemoryIcon /> },
    { label: 'Legacy: Задачи', path: '/legacy/tasks', icon: <TaskIcon /> },
    { label: 'Legacy: Чат', path: '/legacy/chat', icon: <ForumIcon /> },
    { label: 'Legacy: 44-ФЗ', path: '/legacy/fz', icon: <GavelIcon /> },
    ...(user.role === 'admin' ? [
      { label: 'Пользователи', path: '/users', icon: <GroupIcon /> },
      { label: 'Логи API', path: '/logs', icon: <HistoryIcon /> },
      { label: 'Логирование', path: '/logging', icon: <ReceiptLongIcon /> },
      { label: 'Метрики', path: '/metrics', icon: <TimelineIcon /> },
    ] : []),
  ]

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: 1300, backdropFilter: 'blur(6px)', bgcolor: 'rgba(18,26,47,0.85)' }}>
        <Toolbar>
          {mobile && (
            <IconButton color="inherit" sx={{ mr: 1 }} onClick={() => setDrawerOpen(true)}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ flexGrow: 1 }}>msu-help.ru Control Cabinet</Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Tooltip title={darkMode ? 'Темная тема' : 'Светлая тема'}>
              <IconButton color="inherit" onClick={() => {
                const next = !darkMode
                setDarkMode(next)
                localStorage.setItem('openclaw_theme', next ? 'dark' : 'light')
              }}>
                {darkMode ? <DarkModeIcon /> : <LightModeIcon />}
              </IconButton>
            </Tooltip>
            <Chip label={user.role || 'user'} color={user.role === 'admin' ? 'primary' : 'default'} />
            <Avatar>{user.name[0]?.toUpperCase() || 'U'}</Avatar>
            <Typography>{user.name}</Typography>
            <IconButton color="inherit" onClick={onLogout}><LogoutIcon /></IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={mobile ? 'temporary' : 'permanent'}
        open={mobile ? drawerOpen : true}
        onClose={() => setDrawerOpen(false)}
        sx={{ width: drawerWidth, [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', pt: 8 } }}
      >
        <List>
          {menu.map((item) => (
            <ListItemButton
              key={item.path}
              selected={location.pathname === item.path}
              onClick={() => { navigate(item.path); if (mobile) setDrawerOpen(false) }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, ml: mobile ? 0 : `${drawerWidth}px`, pt: 10, px: 3, pb: 3 }}>
        {error && <Alert severity="error" onClose={onClearError} sx={{ mb: 2 }}>{error}</Alert>}
        {children}
      </Box>
    </Box>
  )
}

function AdminGuard({ user, children }: { user: User | null; children: ReactElement }) {
  return user?.role === 'admin' ? children : <Navigate to="/dashboard" />
}

function LoginPage({ context, darkMode, setDarkMode }: { context: any; darkMode: boolean; setDarkMode: (v: boolean) => void }) {
  const [login, setLogin] = useState('rus')
  const [password, setPassword] = useState('14725836')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    context.setError(null)
    try {
      const res = await api.post('/auth/login', { login, password })
      context.setToken(res.data.token)
      localStorage.setItem(tokenStorageKey, res.data.token)
      context.setUser(res.data.user)
    } catch (e: any) {
      context.setError(e.response?.data?.message || 'Ошибка входа')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Card sx={{ width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>Вход в msu-help.ru</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>Используйте login/email и пароль</Typography>
          <Box sx={{ mb: 2 }}>
            <Button
              size="small"
              startIcon={darkMode ? <DarkModeIcon /> : <LightModeIcon />}
              onClick={() => {
                const next = !darkMode
                setDarkMode(next)
                localStorage.setItem('openclaw_theme', next ? 'dark' : 'light')
              }}
            >
              Переключить тему
            </Button>
          </Box>
          <Box component="form" onSubmit={submit}>
            <Stack spacing={2}>
              <TextField label="Login или Email" value={login} onChange={(e) => setLogin(e.target.value)} fullWidth />
              <TextField label="Пароль" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth />
              <Button type="submit" variant="contained" size="large" disabled={busy}>{busy ? 'Вход...' : 'Войти'}</Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Container>
  )
}

function Dashboard({ token, darkMode }: { token: string | null; darkMode: boolean }) {
  const [health, setHealth] = useState<any>(null)
  useEffect(() => {
    if (!token) return
    api.get('/system/health', { headers: { Authorization: `Bearer ${token}` } }).then((r) => setHealth(r.data))
  }, [token])

  const barData = [
    { name: 'Users', value: health?.counters?.users ?? 0 },
    { name: 'Active', value: health?.counters?.active_users ?? 0 },
    { name: 'Agents', value: health?.counters?.agents_online ?? 0 },
    { name: 'Logs', value: health?.counters?.logs ?? 0 },
  ]
  const trendData = [
    { t: 'T-4', logs: Math.max((health?.counters?.logs ?? 0) - 12, 0) },
    { t: 'T-3', logs: Math.max((health?.counters?.logs ?? 0) - 9, 0) },
    { t: 'T-2', logs: Math.max((health?.counters?.logs ?? 0) - 6, 0) },
    { t: 'T-1', logs: Math.max((health?.counters?.logs ?? 0) - 3, 0) },
    { t: 'Now', logs: health?.counters?.logs ?? 0 },
  ]
  const pieData = [
    { name: 'Active users', value: health?.counters?.active_users ?? 0 },
    { name: 'Other users', value: Math.max((health?.counters?.users ?? 0) - (health?.counters?.active_users ?? 0), 0) },
  ]
  const pieColors = darkMode ? ['#4f8cff', '#6b7280'] : ['#1565c0', '#cfd8dc']

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Dashboard</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <MetricCard title="Пользователи" value={health?.counters?.users ?? '-'} />
        <MetricCard title="Активные" value={health?.counters?.active_users ?? '-'} />
        <MetricCard title="Агенты online" value={health?.counters?.agents_online ?? '-'} />
        <MetricCard title="Логи" value={health?.counters?.logs ?? '-'} />
      </Stack>
      <Card><CardContent><Typography variant="h6">Raw health</Typography><pre>{JSON.stringify(health, null, 2)}</pre></CardContent></Card>
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Сводка по системе</Typography>
            <Box sx={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip />
                  <Bar dataKey="value" fill={darkMode ? '#4f8cff' : '#1565c0'} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Распределение пользователей</Typography>
            <Box sx={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100} label>
                    {pieData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                  </Pie>
                  <ChartTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Stack>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Тренд логов (демо-временной ряд)</Typography>
          <Box sx={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" />
                <YAxis />
                <ChartTooltip />
                <Line type="monotone" dataKey="logs" stroke={darkMode ? '#86efac' : '#2e7d32'} strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  )
}

function MetricCard({ title, value }: { title: string; value: string | number }) {
  return (
    <Card sx={{ flex: 1 }}>
      <CardContent>
        <Typography color="text.secondary">{title}</Typography>
        <Typography variant="h4">{value}</Typography>
      </CardContent>
    </Card>
  )
}

function ProfilePage({ context }: { context: any }) {
  const user = context.user as User
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)

  async function submit(event: FormEvent) {
    event.preventDefault()
    await api.put('/auth/profile', { name, email }, { headers: { Authorization: `Bearer ${context.token}` } })
    context.setUser({ ...user, name, email })
  }

  return (
    <Card><CardContent>
      <Typography variant="h5" gutterBottom>Профиль</Typography>
      <Box component="form" onSubmit={submit}>
        <Stack spacing={2} sx={{ maxWidth: 520 }}>
          <TextField label="Имя" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" variant="contained">Сохранить</Button>
        </Stack>
      </Box>
    </CardContent></Card>
  )
}

function UsersPage({ token }: { token: string | null }) {
  const [users, setUsers] = useState<User[]>([])
  const headers = { Authorization: `Bearer ${token}` }

  const load = () => api.get('/users', { headers }).then((res) => setUsers(res.data.users))
  useEffect(() => { load() }, [])

  async function setRole(id: number, role: 'admin' | 'user') { await api.put(`/users/${id}/role`, { role }, { headers }); load() }
  async function setStatus(id: number, is_active: boolean) { await api.put(`/users/${id}/status`, { is_active }, { headers }); load() }

  return (
    <Card><CardContent>
      <Typography variant="h5" gutterBottom>Пользователи</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead><TableRow><TableCell>ID</TableCell><TableCell>Имя</TableCell><TableCell>Email</TableCell><TableCell>Роль</TableCell><TableCell>Статус</TableCell></TableRow></TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.id}</TableCell>
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Button size="small" variant={u.role === 'admin' ? 'contained' : 'outlined'} onClick={() => setRole(u.id, u.role === 'admin' ? 'user' : 'admin')}>
                    {u.role}
                  </Button>
                </TableCell>
                <TableCell><FormControlLabel control={<Switch checked={u.is_active} onChange={(e) => setStatus(u.id, e.target.checked)} />} label={u.is_active ? 'Active' : 'Disabled'} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </CardContent></Card>
  )
}

function LogsPage({ token }: { token: string | null }) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  useEffect(() => { api.get('/system/logs', { headers: { Authorization: `Bearer ${token}` } }).then((res) => setLogs(res.data.logs)) }, [token])
  return (
    <Card><CardContent>
      <Typography variant="h5" gutterBottom>Логи API</Typography>
      <Stack spacing={1}>{logs.map((l) => <Paper key={l.id} sx={{ p: 1.5 }}>{l.created_at} - {l.action} - {l.details}</Paper>)}</Stack>
    </CardContent></Card>
  )
}

function LoggingPage({ token }: { token: string | null }) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    setBusy(true)
    try {
      const res = await api.get('/system/logs', { headers: { Authorization: `Bearer ${token}` } })
      setLogs(res.data.logs || [])
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => { load() }, [token])

  const filtered = logs.filter((log) => `${log.action} ${log.details || ''} ${log.user?.email || ''}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <Card><CardContent>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Страница логирования</Typography>
        <Button startIcon={<RefreshIcon />} onClick={load} disabled={busy}>Обновить</Button>
      </Stack>
      <TextField fullWidth label="Поиск по действию/деталям/email" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ mb: 2 }} />
      <TableContainer component={Paper}>
        <Table>
          <TableHead><TableRow><TableCell>Время</TableCell><TableCell>Action</TableCell><TableCell>User</TableCell><TableCell>Details</TableCell></TableRow></TableHead>
          <TableBody>{filtered.map((l) => <TableRow key={l.id}><TableCell>{l.created_at}</TableCell><TableCell>{l.action}</TableCell><TableCell>{l.user?.email || '-'}</TableCell><TableCell>{l.details || '-'}</TableCell></TableRow>)}</TableBody>
        </Table>
      </TableContainer>
    </CardContent></Card>
  )
}

function MetricsPage({ token }: { token: string | null }) {
  const [metrics, setMetrics] = useState<Record<string, number>>({})
  const [raw, setRaw] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    setBusy(true)
    try {
      const res = await api.get('/system/metrics', { headers: { Authorization: `Bearer ${token}` }, responseType: 'text' })
      const text = String(res.data || '')
      setRaw(text)
      const parsed: Record<string, number> = {}
      text.split('\n').forEach((line) => {
        if (!line || line.startsWith('#')) return
        const [name, value] = line.trim().split(/\s+/)
        const numeric = Number(value)
        if (name && !Number.isNaN(numeric)) parsed[name] = numeric
      })
      setMetrics(parsed)
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => { load() }, [token])

  return (
    <Stack spacing={2}>
      <Card><CardContent>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">System Metrics</Typography>
          <Button startIcon={<RefreshIcon />} onClick={load} disabled={busy}>Обновить</Button>
        </Stack>
        <TableContainer component={Paper}>
          <Table>
            <TableHead><TableRow><TableCell>Метрика</TableCell><TableCell>Значение</TableCell></TableRow></TableHead>
            <TableBody>{Object.entries(metrics).map(([k, v]) => <TableRow key={k}><TableCell>{k}</TableCell><TableCell>{v}</TableCell></TableRow>)}</TableBody>
          </Table>
        </TableContainer>
      </CardContent></Card>
      <Card><CardContent><Typography variant="h6">Raw</Typography><pre>{raw}</pre></CardContent></Card>
    </Stack>
  )
}

function AgentPage() {
  const [nodes, setNodes] = useState<AgentNode[]>([])
  useEffect(() => { api.get('/agent/nodes').then((res) => setNodes(res.data.nodes)) }, [])
  return (
    <Card><CardContent>
      <Typography variant="h5" gutterBottom>Агенты</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead><TableRow><TableCell>Имя</TableCell><TableCell>Статус</TableCell><TableCell>IP</TableCell><TableCell>Last Seen</TableCell></TableRow></TableHead>
          <TableBody>
            {nodes.map((n) => (
              <TableRow key={n.id}>
                <TableCell>{n.name}</TableCell>
                <TableCell><Chip size="small" color={n.status === 'online' ? 'success' : 'default'} label={n.status} /></TableCell>
                <TableCell>{n.last_ip || '-'}</TableCell>
                <TableCell>{n.last_seen_at || 'never'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </CardContent></Card>
  )
}

function LegacyFramePage({ title, src }: { title: string; src: string }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>{title}</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Раздел открыт из legacy-системы OpenClaw для постепенной миграции функций в новый кабинет.
        </Typography>
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
          <Box component="iframe" src={src} sx={{ width: '100%', height: '70vh', border: 'none', backgroundColor: 'background.default' }} />
        </Box>
      </CardContent>
    </Card>
  )
}

async function logout(context: any) {
  if (context.token) await api.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${context.token}` } }).catch(() => null)
  context.setToken(null)
  context.setUser(null)
  localStorage.removeItem(tokenStorageKey)
}

export default App
