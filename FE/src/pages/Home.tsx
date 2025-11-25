import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Link } from "react-router-dom"
import { Upload, Brain, Zap, ArrowRight, Workflow, LogIn } from "lucide-react"
import { LoginModal } from "@/components/login-modal"
import { SignupModal } from "@/components/signup-modal"

export default function Home() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false)

  return (
    <>
      <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-28 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-block mb-4 px-3 py-1 rounded-full bg-secondary border border-primary/20 text-xs font-medium text-primary">
              ✨ AI-Powered Annotation
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6 text-pretty">
              Build Better Datasets Faster
            </h1>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Upload images, annotate with AI assistance, create datasets, and train models—all in one platform. No
              coding required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/datasets">
                <Button size="lg" className="gap-2 w-full sm:w-auto">
                  Start Annotating <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Button variant="outline" size="lg">
                Watch Demo
              </Button>
            </div>
          </div>
          <div className="relative h-64 sm:h-80 md:h-96 bg-gradient-to-br from-primary/20 to-accent/10 rounded-2xl border border-primary/30 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
            <Upload className="w-24 h-24 text-primary/40" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t border-border px-4 sm:px-6 lg:px-8 py-20 bg-card/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Everything you need to create high-quality annotated datasets
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 bg-card border border-border rounded-lg hover:border-primary/50 transition">
              <Upload className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Easy Upload</h3>
              <p className="text-muted-foreground text-sm">
                Batch upload images from your computer or cloud storage in seconds
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 bg-card border border-border rounded-lg hover:border-primary/50 transition">
              <Brain className="w-8 h-8 text-accent mb-4" />
              <h3 className="font-semibold text-lg mb-2">Smart Annotation</h3>
              <p className="text-muted-foreground text-sm">
                AI-assisted labeling with bounding boxes, polygons, and classifications
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 bg-card border border-border rounded-lg hover:border-primary/50 transition">
              <Zap className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Train Models</h3>
              <p className="text-muted-foreground text-sm">
                Export datasets and train custom models with pre-configured ML pipelines
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="px-4 sm:px-6 lg:px-8 py-20 max-w-7xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold mb-12 text-center">Your Workflow</h2>

        <div className="grid md:grid-cols-4 gap-4 md:gap-0">
          {[
            { step: "1", title: "Upload", desc: "Add your images" },
            { step: "2", title: "Annotate", desc: "Label with AI help" },
            { step: "3", title: "Organize", desc: "Build datasets" },
            { step: "4", title: "Train", desc: "Train your models" },
          ].map((item) => (
            <div key={item.step} className="relative">
              <div className="text-center mb-4">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mx-auto mb-3">
                  {item.step}
                </div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
              {item.step !== "4" && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[40%] h-0.5 bg-gradient-to-r from-primary/50 to-transparent"></div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border px-4 sm:px-6 lg:px-8 py-16 bg-secondary/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-muted-foreground mb-8">Create your first dataset in minutes. No credit card required.</p>
          <Link to="/upload">
            <Button size="lg" className="gap-2">
              Launch flowmind <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 sm:px-6 lg:px-8 py-8 bg-card/50 text-sm text-muted-foreground">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Workflow className="w-5 h-5" />
            <span className="font-medium">flowmind</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition">
              Privacy
            </a>
            <a href="#" className="hover:text-foreground transition">
              Terms
            </a>
            <a href="#" className="hover:text-foreground transition">
              Contact
            </a>
          </div>
        </div>
      </footer>
      </div>
      <LoginModal open={isLoginModalOpen} onOpenChange={setIsLoginModalOpen} />
      <SignupModal open={isSignupModalOpen} onOpenChange={setIsSignupModalOpen} />
    </>
  )
}
