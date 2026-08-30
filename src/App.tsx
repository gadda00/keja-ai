import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import WhatsAppFloat from '@/components/layout/WhatsAppFloat'
import AuthModal from '@/components/auth/AuthModal'
import ErrorBoundary from '@/components/layout/ErrorBoundary'
import Home from '@/pages/Home'
import Properties from '@/pages/Properties'

// Route-level code splitting — heavy pages load on demand
const PropertyDetail = lazy(() => import('@/pages/PropertyDetail'))
const AskKeja = lazy(() => import('@/pages/AskKeja'))
const TrustCenter = lazy(() => import('@/pages/TrustCenter'))
const About = lazy(() => import('@/pages/About'))
const Contact = lazy(() => import('@/pages/Contact'))
const Insights = lazy(() => import('@/pages/Insights'))
const ListProperty = lazy(() => import('@/pages/ListProperty'))
const Manage = lazy(() => import('@/pages/Manage'))
const Account = lazy(() => import('@/pages/Account'))
const Ecosystem = lazy(() => import('@/pages/Ecosystem'))
const InvestmentCalculator = lazy(() => import('@/pages/InvestmentCalculator'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Tokenize = lazy(() => import('@/pages/Tokenize'))
const Admin = lazy(() => import('@/pages/Admin'))
const Partners = lazy(() => import('@/pages/Partners'))
const NotFound = lazy(() => import('@/pages/NotFound'))

function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      // allow the new page to paint, then scroll to the anchor target
      const t = window.setTimeout(() => {
        document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
      }, 60)
      return () => window.clearTimeout(t)
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash])
  return null
}

function LazyFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading page">
      <div className="flex flex-col items-center gap-3">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-gold-100 border-t-gold-600" />
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Loading…</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <ScrollManager />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-gold-300"
      >
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content" className="flex-1 pt-16">
        <ErrorBoundary>
          <Suspense fallback={<LazyFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/properties" element={<Properties />} />
              <Route path="/properties/:id" element={<PropertyDetail />} />
              <Route path="/ask" element={<AskKeja />} />
              <Route path="/invest" element={<InvestmentCalculator />} />
              <Route path="/tokenize" element={<Tokenize />} />
              <Route path="/trust" element={<TrustCenter />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/sell" element={<ListProperty />} />
              <Route path="/manage" element={<Manage />} />
              <Route path="/account" element={<Account />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/ecosystem" element={<Ecosystem />} />
              <Route path="/partners" element={<Partners />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
      <WhatsAppFloat />
      <AuthModal />
    </div>
  )
}
