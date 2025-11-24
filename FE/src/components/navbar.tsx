import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Workflow } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LoginModal } from "@/components/login-modal"
import { SignupModal } from "@/components/signup-modal"

type AuthUser = {
  name: string
  email: string
}

export function Navbar() {
  const location = useLocation()
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + "/")

  const navItems = [
    { href: "/datasets", label: "Datasets" },
    { href: "/train", label: "Train" },
    { href: "/evaluate", label: "Evaluate" },
  ]

  // ✅ 초기 로드시 localStorage에서 로그인 정보 복원
  useEffect(() => {
    try {
      const storedName = localStorage.getItem("userName")
      const storedEmail = localStorage.getItem("userEmail")
      if (storedName || storedEmail) {
        setCurrentUser({
          name: storedName || storedEmail || "사용자",
          email: storedEmail || "",
        })
      }
    } catch {
      // localStorage 사용 불가 환경은 무시
    }
  }, [])

  // ✅ 로그인 성공 시 Navbar 쪽 상태 업데이트
  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user)
    try {
      localStorage.setItem("userName", user.name)
      localStorage.setItem("userEmail", user.email)
    } catch {
      // 저장 실패는 UI 동작엔 영향 없음
    }
  }

  // ✅ 로그아웃 처리
  const handleLogout = () => {
    setCurrentUser(null)
    try {
      localStorage.removeItem("userName")
      localStorage.removeItem("userEmail")
      localStorage.removeItem("accessToken")
    } catch {
      // 무시
    }
  }

  return (
    <>
      <nav className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2 hover:opacity-80 transition"
            >
              <Workflow className="w-6 h-6 text-primary" />
              <span className="font-bold text-lg">Flow Mind</span>
            </Link>

            {/* Main Nav Items */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
                    isActive(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              {currentUser ? (
                <>
                  <span className="text-sm text-muted-foreground max-w-[140px] truncate">
                    {currentUser.name}님
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="text-xs sm:text-sm"
                  >
                    로그아웃
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsLoginModalOpen(true)}
                    className="text-xs sm:text-sm"
                    aria-label="로그인"
                  >
                    로그인
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setIsSignupModalOpen(true)}
                    className="text-xs sm:text-sm"
                    aria-label="회원가입"
                  >
                    회원가입
                  </Button>
                </>
              )}

              {/* Mobile Menu Button (추후 구현용) */}
              <div className="md:hidden">
                <button className="p-2 hover:bg-accent/10 rounded transition">
                  <span className="text-sm">Menu</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <LoginModal
        open={isLoginModalOpen}
        onOpenChange={setIsLoginModalOpen}
        onLoginSuccess={handleLoginSuccess}
      />
      <SignupModal
        open={isSignupModalOpen}
        onOpenChange={setIsSignupModalOpen}
      />
    </>
  )
}
