'use client'

import { useState, useCallback, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  createAPIKey,
  revokeAPIKey,
  getAPIKeys,
} from '@/app/actions/api-keys'
import type { APIKey } from '@/lib/security/types'
import {
  RefreshCw,
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  FileText,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface APIKeysClientProps {
  initialData: APIKey[]
  currentUser: {
    id: string
    email: string
    role: string
  }
}

const availablePermissions = [
  { value: 'read:customers', label: 'Read Customers' },
  { value: 'write:customers', label: 'Write Customers' },
  { value: 'read:projects', label: 'Read Projects' },
  { value: 'write:projects', label: 'Write Projects' },
  { value: 'read:job_orders', label: 'Read Job Orders' },
  { value: 'write:job_orders', label: 'Write Job Orders' },
  { value: 'read:invoices', label: 'Read Invoices' },
  { value: 'write:invoices', label: 'Write Invoices' },
]

const expiryOptions = [
  { value: '0', label: 'Never expires' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '180', label: '180 days' },
  { value: '365', label: '1 year' },
]

export function APIKeysClient({
  initialData,
}: APIKeysClientProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<APIKey[]>(initialData)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyDescription, setNewKeyDescription] = useState('')
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>([])
  const [newKeyExpiry, setNewKeyExpiry] = useState('90')
  const [newKeyRateLimit, setNewKeyRateLimit] = useState('60')
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchData = useCallback(async () => {
    startTransition(async () => {
      const result = await getAPIKeys()
      if (result.success && result.data) {
        setData(result.data)
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to fetch API keys',
          variant: 'destructive',
        })
      }
    })
  }, [toast])

  const handleRefresh = () => {
    fetchData()
  }

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Key name is required',
        variant: 'destructive',
      })
      return
    }

    if (newKeyPermissions.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one permission is required',
        variant: 'destructive',
      })
      return
    }

    startTransition(async () => {
      const expiryDays = parseInt(newKeyExpiry)
      const rateLimit = parseInt(newKeyRateLimit)
      
      const result = await createAPIKey(
        newKeyName.trim(),
        newKeyPermissions,
        {
          description: newKeyDescription.trim() || undefined,
          rateLimitPerMinute: rateLimit > 0 ? rateLimit : undefined,
          expiresInDays: expiryDays > 0 ? expiryDays : undefined,
        }
      )
      
      if (result.success && result.key) {
        setGeneratedKey(result.key)
        fetchData()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create API key',
          variant: 'destructive',
        })
      }
    })
  }

  const handleRevokeKey = async (keyId: string, keyName: string) => {
    startTransition(async () => {
      const result = await revokeAPIKey(keyId)
      
      if (result.success) {
        toast({
          title: 'API Key Revoked',
          description: `Successfully revoked "${keyName}"`,
        })
        fetchData()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to revoke API key',
          variant: 'destructive',
        })
      }
    })
  }

  const handleCopyKey = async () => {
    if (generatedKey) {
      await navigator.clipboard.writeText(generatedKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false)
    setNewKeyName('')
    setNewKeyDescription('')
    setNewKeyPermissions([])
    setNewKeyExpiry('90')
    setNewKeyRateLimit('60')
    setGeneratedKey(null)
    setCopied(false)
  }

  const togglePermission = (permission: string) => {
    setNewKeyPermissions(prev =>
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    )
  }

  const activeKeys = data.filter(k => k.is_active)
  const revokedKeys = data.filter(k => !k.is_active)

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Keys</CardTitle>
            <Key className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeKeys.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revoked Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{revokedKeys.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* API Keys Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Manage API keys for external integrations</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isPending}
              >
                <RefreshCw className={cn('mr-2 h-4 w-4', isPending && 'animate-spin')} />
                Refresh
              </Button>
              <Dialog open={createDialogOpen} onOpenChange={handleCloseCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Key
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {generatedKey ? 'API Key Created' : 'Create API Key'}
                    </DialogTitle>
                    <DialogDescription>
                      {generatedKey
                        ? 'Copy your API key now. You won\'t be able to see it again.'
                        : 'Create a new API key for external integrations'}
                    </DialogDescription>
                  </DialogHeader>
                  
                  {generatedKey ? (
                    <div className="space-y-4">
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Important</AlertTitle>
                        <AlertDescription>
                          This is the only time you&apos;ll see this key. Copy it now and store it securely.
                        </AlertDescription>
                      </Alert>
                      <div className="flex items-center gap-2">
                        <Input
                          value={generatedKey}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleCopyKey}
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          placeholder="e.g., Production API"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description (optional)</Label>
                        <Textarea
                          id="description"
                          placeholder="What is this key used for?"
                          value={newKeyDescription}
                          onChange={(e) => setNewKeyDescription(e.target.value)}
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label>Permissions</Label>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {availablePermissions.map((perm) => (
                            <div key={perm.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={perm.value}
                                checked={newKeyPermissions.includes(perm.value)}
                                onCheckedChange={() => togglePermission(perm.value)}
                              />
                              <label
                                htmlFor={perm.value}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {perm.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="expiry">Expiry</Label>
                          <Select value={newKeyExpiry} onValueChange={setNewKeyExpiry}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select expiry" />
                            </SelectTrigger>
                            <SelectContent>
                              {expiryOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="rateLimit">Rate Limit/min</Label>
                          <Input
                            id="rateLimit"
                            type="number"
                            min="1"
                            max="1000"
                            value={newKeyRateLimit}
                            onChange={(e) => setNewKeyRateLimit(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <DialogFooter>
                    {generatedKey ? (
                      <Button onClick={handleCloseCreateDialog}>Done</Button>
                    ) : (
                      <>
                        <Button variant="outline" onClick={handleCloseCreateDialog}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateKey} disabled={isPending}>
                          {isPending ? 'Creating...' : 'Create Key'}
                        </Button>
                      </>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key Prefix</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="w-[120px]">Created</TableHead>
                  <TableHead className="w-[120px]">Expires</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPending && data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Loading...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FileText className="h-8 w-8" />
                        No API keys found
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((key) => (
                    <TableRow key={key.id} className={cn(!key.is_active && 'opacity-50')}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{key.name}</div>
                          {key.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {key.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {key.key_prefix}...
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {key.permissions.slice(0, 2).map((perm) => (
                            <Badge key={perm} variant="outline" className="text-xs">
                              {perm.split(':')[1]}
                            </Badge>
                          ))}
                          {key.permissions.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{key.permissions.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(key.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {key.expires_at ? (
                          <span title={format(new Date(key.expires_at), 'MMM dd, yyyy')}>
                            {formatDistanceToNow(new Date(key.expires_at), { addSuffix: true })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {key.is_active ? (
                          <Badge variant="default" className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Revoked</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {key.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokeKey(key.id, key.name)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
