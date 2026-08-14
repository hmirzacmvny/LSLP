import { useState } from 'react'
import { motion } from 'framer-motion'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useNavigate, useLocation } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const reveal = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 380, damping: 30 },
  },
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate(from, { replace: true })
    } catch {
      setError('Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      className="arrival-surface min-h-screen flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
    >
      <motion.div variants={stagger} initial="hidden" animate="visible">
        <Card className="w-full max-w-[400px]">
          <CardContent className="pt-8 pb-8 px-8 space-y-6">
            <motion.div variants={reveal} className="text-center space-y-2">
              <img
                src="/seal.png"
                alt="City of Mount Vernon"
                className="h-20 w-20 object-contain mx-auto"
              />
              <p className="text-sm text-muted-foreground">City of Mount Vernon</p>
              <h1 className="text-2xl font-semibold tracking-tight">LSLP Platform</h1>
              <p className="text-xs text-muted-foreground">Lead Service Line Inventory System</p>
            </motion.div>

            <Separator />

            <motion.form variants={reveal} onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="you@mountvernonny.gov"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1A56A0] hover:bg-[#143F75] text-white"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </motion.form>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
