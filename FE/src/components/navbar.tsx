import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Workflow, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LoginModal } from "@/components/login-modal"

export function Navbar() {
  const location = useLocation()
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + "/")

  const navItems = [
    { href: "/datasets", label: "Datasets" },
    { href: "/train", label: "Train" },
    { href: "/evaluate", label: "Evaluate" },
  ]

  return (
    <>
      <nav className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition">
              <Workflow className="w-6 h-6 text-primary" />
              <span className="font-bold text-lg">flowmind</span>
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
              {/* Login Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsLoginModalOpen(true)}
                className="hover:bg-accent/10"
                aria-label="로그인"
              >
                <User className="w-5 h-5" />
              </Button>

              {/* Mobile Menu Button */}
              <div className="md:hidden">
                <button className="p-2 hover:bg-accent/10 rounded transition">
                  <span className="text-sm">Menu</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <LoginModal open={isLoginModalOpen} onOpenChange={setIsLoginModalOpen} />
    </>
  )
}
