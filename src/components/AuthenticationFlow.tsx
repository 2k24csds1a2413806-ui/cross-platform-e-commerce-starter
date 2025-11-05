"use client"

import * as React from "react"
import { LogIn, UserRound, LockKeyhole, EyeOff, CircleCheckBig, MailCheck, IterationCw } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Transition } from "@headlessui/react"

type Mode = "login" | "signup" | "forgot"

interface AuthenticationFlowProps {
  className?: string
  style?: React.CSSProperties
  initialMode?: Mode
  onEmailLogin?: (data: { email: string; password: string; remember: boolean }) => Promise<void> | void
  onEmailSignup?: (data: { email: string; password: string }) => Promise<void> | void
  onResetRequest?: (data: { email: string }) => Promise<void> | void
  onResetConfirm?: (data: { email: string; code: string; newPassword: string }) => Promise<void> | void
  onSocialLogin?: (provider: "google" | "github" | "apple" | string) => Promise<void> | void
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function AuthenticationFlow({
  className,
  style,
  initialMode = "login",
  onEmailLogin,
  onEmailSignup,
  onResetRequest,
  onResetConfirm,
  onSocialLogin,
}: AuthenticationFlowProps) {
  const [mode, setMode] = React.useState<Mode>(initialMode)
  const [loading, setLoading] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [remember, setRemember] = React.useState(true)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)

  // Forgot password flow
  const [resetStage, setResetStage] = React.useState<"request" | "verify">("request")
  const [verificationCode, setVerificationCode] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmNewPassword, setConfirmNewPassword] = React.useState("")

  const cardRef = React.useRef<HTMLDivElement>(null)

  // Remember me email persistence (safely in client)
  React.useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const saved = localStorage.getItem("auth:rememberedEmail")
      if (saved) {
        setEmail(saved)
        setRemember(true)
      }
    } catch {
      // ignore
    }
  }, [])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    try {
      if (remember && validateEmail(email)) {
        localStorage.setItem("auth:rememberedEmail", email)
      } else if (!remember) {
        localStorage.removeItem("auth:rememberedEmail")
      }
    } catch {
      // ignore
    }
  }, [remember, email])

  // Reset UI state when mode changes
  React.useEffect(() => {
    setErrors({})
    setSuccessMsg(null)
    setLoading(false)
    setPassword("")
    setConfirmPassword("")
    setShowPassword(false)
    setResetStage("request")
    setVerificationCode("")
    setNewPassword("")
    setConfirmNewPassword("")
    // subtle focus shift for accessibility
    const id = setTimeout(() => {
      cardRef.current?.querySelector<HTMLInputElement>("input")?.focus()
    }, 50)
    return () => clearTimeout(id)
  }, [mode])

  const header = React.useMemo(() => {
    switch (mode) {
      case "login":
        return { title: "Welcome back", desc: "Sign in to your account to continue" }
      case "signup":
        return { title: "Create your account", desc: "Start your journey in a minute" }
      case "forgot":
        return resetStage === "request"
          ? { title: "Reset your password", desc: "We’ll send a verification code to your email" }
          : { title: "Verify and update", desc: "Enter the code and set a new password" }
      default:
        return { title: "", desc: "" }
    }
  }, [mode, resetStage])

  function validateForm() {
    const next: Record<string, string> = {}
    if (!validateEmail(email)) next.email = "Enter a valid email address"
    if (mode === "login" || mode === "signup") {
      if (password.length < 8) next.password = "Password must be at least 8 characters"
    }
    if (mode === "signup") {
      if (confirmPassword !== password) next.confirmPassword = "Passwords do not match"
    }
    if (mode === "forgot") {
      if (resetStage === "request") {
        // only email needed
      } else {
        if (!verificationCode.trim()) next.code = "Enter the verification code"
        if (newPassword.length < 8) next.newPassword = "New password must be at least 8 characters"
        if (confirmNewPassword !== newPassword) next.confirmNewPassword = "Passwords do not match"
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSuccessMsg(null)
    if (!validateForm()) return
    setLoading(true)
    try {
      if (mode === "login") {
        await onEmailLogin?.({ email, password, remember })
        toast.success("Signed in successfully")
        setSuccessMsg("Signed in successfully")
      } else if (mode === "signup") {
        await onEmailSignup?.({ email, password })
        toast.success("Account created")
        setSuccessMsg("Account created. You can now sign in.")
        setMode("login")
      } else if (mode === "forgot") {
        if (resetStage === "request") {
          await onResetRequest?.({ email })
          toast.success("Verification code sent")
          setSuccessMsg("We sent a verification code to your email")
          setResetStage("verify")
        } else {
          await onResetConfirm?.({ email, code: verificationCode.trim(), newPassword })
          toast.success("Password updated")
          setSuccessMsg("Password updated. You can now sign in.")
          setMode("login")
        }
      }
    } catch (err: any) {
      const message = err?.message || "Something went wrong. Please try again."
      toast.error(message)
      setErrors((prev) => ({ ...prev, form: message }))
    } finally {
      setLoading(false)
    }
  }

  function SocialButtons() {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          className="w-full bg-card hover:bg-secondary"
          onClick={async () => {
            try {
              setLoading(true)
              await onSocialLogin?.("google")
            } catch (e: any) {
              toast.error(e?.message || "Google sign-in failed")
            } finally {
              setLoading(false)
            }
          }}
          aria-label="Continue with Google"
          disabled={loading}
        >
          <UserRound className="mr-2 h-4 w-4" aria-hidden="true" />
          Continue with Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full bg-card hover:bg-secondary"
          onClick={async () => {
            try {
              setLoading(true)
              await onSocialLogin?.("github")
            } catch (e: any) {
              toast.error(e?.message || "GitHub sign-in failed")
            } finally {
              setLoading(false)
            }
          }}
          aria-label="Continue with GitHub"
          disabled={loading}
        >
          <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
          Continue with GitHub
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("w-full max-w-md", className)} style={style}>
      <Card ref={cardRef} className="w-full bg-card border-border shadow-sm">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-accent text-foreground">
              {mode === "login" && <LogIn className="h-5 w-5" aria-hidden="true" />}
              {mode === "signup" && <UserRound className="h-5 w-5" aria-hidden="true" />}
              {mode === "forgot" && resetStage === "request" && <MailCheck className="h-5 w-5" aria-hidden="true" />}
              {mode === "forgot" && resetStage === "verify" && <CircleCheckBig className="h-5 w-5" aria-hidden="true" />}
            </div>
            <CardTitle className="text-xl sm:text-2xl">{header.title}</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground">{header.desc}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Transition
            as="div"
            appear
            show
            enter="transition-all ease-out duration-300"
            enterFrom="opacity-0 -translate-y-1"
            enterTo="opacity-100 translate-y-0"
          >
            <form onSubmit={handleSubmit} className="space-y-4" noValidate aria-describedby={errors.form ? "form-error" : undefined}>
              {/* Global form error */}
              {errors.form ? (
                <div
                  id="form-error"
                  className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                  role="alert"
                >
                  {errors.form}
                </div>
              ) : null}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className="bg-card"
                />
                {errors.email ? (
                  <p id="email-error" className="text-xs text-destructive" role="status" aria-live="polite">
                    {errors.email}
                  </p>
                ) : null}
              </div>

              {/* Password / Conditional fields */}
              {mode !== "forgot" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === "login" && (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                        onClick={() => setMode("forgot")}
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      placeholder={mode === "login" ? "Your password" : "Create a strong password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-invalid={!!errors.password}
                      aria-describedby={errors.password ? "password-error" : undefined}
                      className="bg-card pr-10"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground focus:outline-none"
                    >
                      <EyeOff className={cn("h-4 w-4 transition-transform", showPassword ? "rotate-180 opacity-70" : "")} />
                    </button>
                  </div>
                  {errors.password ? (
                    <p id="password-error" className="text-xs text-destructive" role="status" aria-live="polite">
                      {errors.password}
                    </p>
                  ) : null}
                </div>
              )}

              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    aria-invalid={!!errors.confirmPassword}
                    aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
                    className="bg-card"
                  />
                  {errors.confirmPassword ? (
                    <p id="confirm-password-error" className="text-xs text-destructive" role="status" aria-live="polite">
                      {errors.confirmPassword}
                    </p>
                  ) : null}
                </div>
              )}

              {mode === "forgot" && resetStage === "verify" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Verification code</Label>
                    <Input
                      id="code"
                      inputMode="numeric"
                      placeholder="6-digit code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      aria-invalid={!!errors.code}
                      aria-describedby={errors.code ? "code-error" : undefined}
                      className="bg-card"
                    />
                    {errors.code ? (
                      <p id="code-error" className="text-xs text-destructive" role="status" aria-live="polite">
                        {errors.code}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Create a strong password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        aria-invalid={!!errors.newPassword}
                        aria-describedby={errors.newPassword ? "new-password-error" : undefined}
                        className="bg-card pr-10"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground focus:outline-none"
                      >
                        <EyeOff className={cn("h-4 w-4 transition-transform", showPassword ? "rotate-180 opacity-70" : "")} />
                      </button>
                    </div>
                    {errors.newPassword ? (
                      <p id="new-password-error" className="text-xs text-destructive" role="status" aria-live="polite">
                        {errors.newPassword}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmNewPassword">Confirm new password</Label>
                    <Input
                      id="confirmNewPassword"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Re-enter your new password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      aria-invalid={!!errors.confirmNewPassword}
                      aria-describedby={errors.confirmNewPassword ? "confirm-new-password-error" : undefined}
                      className="bg-card"
                    />
                    {errors.confirmNewPassword ? (
                      <p id="confirm-new-password-error" className="text-xs text-destructive" role="status" aria-live="polite">
                        {errors.confirmNewPassword}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Remember me + forgot link */}
              {mode === "login" && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember"
                      checked={remember}
                      onCheckedChange={(v) => setRemember(Boolean(v))}
                      aria-label="Remember me"
                    />
                    <Label htmlFor="remember" className="text-sm text-muted-foreground">
                      Remember me
                    </Label>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    onClick={() => setMode("forgot")}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Success message */}
              {successMsg ? (
                <div className="flex items-center gap-2 rounded-md border border-border bg-accent/40 p-3 text-sm">
                  <CircleCheckBig className="h-4 w-4 text-green-600" aria-hidden="true" />
                  <p className="text-foreground">{successMsg}</p>
                </div>
              ) : null}

              {/* Submit */}
              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:opacity-90" disabled={loading}>
                {loading ? (
                  <span className="inline-flex items-center">
                    <IterationCw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Processing...
                  </span>
                ) : mode === "login" ? (
                  <span className="inline-flex items-center">
                    <LockKeyhole className="mr-2 h-4 w-4" aria-hidden="true" />
                    Sign in
                  </span>
                ) : mode === "signup" ? (
                  <span className="inline-flex items-center">
                    <UserRound className="mr-2 h-4 w-4" aria-hidden="true" />
                    Create account
                  </span>
                ) : resetStage === "request" ? (
                  <span className="inline-flex items-center">
                    <MailCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                    Send code
                  </span>
                ) : (
                  <span className="inline-flex items-center">
                    <CircleCheckBig className="mr-2 h-4 w-4" aria-hidden="true" />
                    Update password
                  </span>
                )}
              </Button>

              {/* Mode switch */}
              <div className="text-center text-sm text-muted-foreground">
                {mode === "login" ? (
                  <span>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("signup")}
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      Sign up
                    </button>
                  </span>
                ) : mode === "signup" ? (
                  <span>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("login")}
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      Sign in
                    </button>
                  </span>
                ) : (
                  <span>
                    Remembered your password?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("login")}
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      Back to sign in
                    </button>
                  </span>
                )}
              </div>
            </form>
          </Transition>

          {/* Divider */}
          {mode !== "forgot" && (
            <>
              <div className="relative">
                <Separator className="bg-border" />
                <div className="absolute inset-0 -top-3 flex justify-center">
                  <span className="bg-card px-3 text-xs text-muted-foreground">or continue with</span>
                </div>
              </div>
              <SocialButtons />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}