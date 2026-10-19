import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { formatDownloads, formatNumber } from './data/apps'
import heroImage from '../assets/hero.png'
import errorImage from '../assets/error-404.png'
import './App.css'

const RatingChart = lazy(() => import('./components/RatingChart.jsx'))

const Icon = ({ name, size = 20 }) => {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }

  const paths = {
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    back: <><path d="M19 12H5" /><path d="m11 18-6-6 6-6" /></>,
    download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4.2 4.2" /></>,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    close: <><path d="m18 6-12 12" /><path d="m6 6 12 12" /></>,
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></>,
  }

  return <svg {...common}>{paths[name]}</svg>
}

const readInstalledIds = () => {
  try {
    const stored = window.localStorage.getItem('appverse-installed-apps')
    if (!stored) return []
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) throw new TypeError('Installed apps must be stored as an array.')
    return parsed.filter((id) => Number.isInteger(id))
  } catch (error) {
    console.error('Unable to read installed apps from local storage.', error)
    return []
  }
}

const AppShell = () => {
  const [apps, setApps] = useState(null)
  const [dataError, setDataError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [installedIds, setInstalledIds] = useState(readInstalledIds)
  const [toast, setToast] = useState(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const location = useLocation()
  const lastPath = useRef(location.pathname)
  const toastTimer = useRef(null)

  useEffect(() => {
    const controller = new AbortController()

    const loadApps = async () => {
      try {
        const response = await fetch('/data.json', { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`App data request failed with status ${response.status}.`)
        }

        const data = await response.json()
        if (!Array.isArray(data) || data.length !== 20) {
          throw new TypeError('App data must contain exactly 20 apps.')
        }

        const ids = new Set()
        const isValid = data.every((app) => {
          const validRatings =
            Array.isArray(app.ratings) &&
            app.ratings.length === 5 &&
            app.ratings.every((rating, index) =>
              rating.name === `${index + 1} star` &&
              Number.isFinite(rating.count) &&
              rating.count >= 0,
            )
          const validApp =
            Number.isInteger(app.id) &&
            !ids.has(app.id) &&
            typeof app.title === 'string' &&
            typeof app.companyName === 'string' &&
            typeof app.image === 'string' &&
            typeof app.description === 'string' &&
            Number.isFinite(app.size) &&
            Number.isFinite(app.reviews) &&
            Number.isFinite(app.ratingAvg) &&
            Number.isFinite(app.downloads) &&
            validRatings

          if (validApp) ids.add(app.id)
          return validApp
        })

        if (!isValid) {
          throw new TypeError('App data contains an invalid app record.')
        }

        setApps(data)
        setInstalledIds((idsFromStorage) => idsFromStorage.filter((id) => ids.has(id)))
        setDataError('')
      } catch (error) {
        if (error.name === 'AbortError') return
        console.error('Unable to load app data.', error)
        setDataError(error.message || 'The app collection could not be loaded.')
      }
    }

    loadApps()
    return () => controller.abort()
  }, [loadAttempt])

  useEffect(() => {
    if (lastPath.current === location.pathname) return undefined
    lastPath.current = location.pathname
    setRouteLoading(true)
    const timer = window.setTimeout(() => setRouteLoading(false), 320)
    return () => window.clearTimeout(timer)
  }, [location.pathname])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const showToast = (message, type = 'success') => {
    window.clearTimeout(toastTimer.current)
    setToast({ message, type })
    toastTimer.current = window.setTimeout(() => setToast(null), 3000)
  }

  const installApp = (app) => {
    if (installedIds.includes(app.id)) return
    const nextIds = [...installedIds, app.id]
    try {
      window.localStorage.setItem('appverse-installed-apps', JSON.stringify(nextIds))
      setInstalledIds(nextIds)
      showToast(`${app.title} was added to your installation library.`)
    } catch (error) {
      console.error('Unable to save installed app.', error)
      showToast('Could not save your installation. Check your browser storage and try again.', 'error')
    }
  }

  const uninstallApp = (app) => {
    const nextIds = installedIds.filter((id) => id !== app.id)
    try {
      window.localStorage.setItem('appverse-installed-apps', JSON.stringify(nextIds))
      setInstalledIds(nextIds)
      showToast(`${app.title} was removed from your installations.`)
    } catch (error) {
      console.error('Unable to remove installed app.', error)
      showToast('Could not update your installations. Please try again.', 'error')
    }
  }

  const retryLoadApps = () => {
    setApps(null)
    setDataError('')
    setLoadAttempt((attempt) => attempt + 1)
  }

  return (
    <div className="app-shell">
      <Header />
      <main className="site-main">
        {apps ? (
          <Outlet context={{ apps, installedIds, installApp, uninstallApp, showToast }} />
        ) : dataError ? (
          <section className="page-container data-error-state" role="alert">
            <span className="eyebrow">Something went wrong</span>
            <h1>We couldn't load the app collection.</h1>
            <p>{dataError}</p>
            <button className="button button-primary" type="button" onClick={retryLoadApps}>Try again</button>
          </section>
        ) : (
          <div className="data-loading" role="status"><span className="spinner" />Loading the app collection...</div>
        )}
      </main>
      <Footer />
      {routeLoading && (
        <div className="route-loader" role="status" aria-label="Loading page">
          <span className="spinner" />
          <span>Getting things ready...</span>
        </div>
      )}
      {toast && (
        <div className={`toast-message ${toast.type}`} role="status">
          <span className="toast-icon"><Icon name={toast.type === 'success' ? 'check' : 'close'} size={17} /></span>
          <span>{toast.message}</span>
          <button className="toast-close" type="button" aria-label="Dismiss notification" onClick={() => setToast(null)}>
            <Icon name="close" size={17} />
          </button>
        </div>
      )}
    </div>
  )
}

const Header = () => (
  <header className="site-header">
    <div className="header-inner">
      <Link className="brand" to="/" aria-label="AppVerse home">
        <span className="brand-mark"><Icon name="spark" size={22} /></span>
        <span>Appverse<span className="brand-period">.</span></span>
      </Link>
      <nav className="main-nav" aria-label="Main navigation">
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/apps">Apps</NavLink>
        <NavLink to="/installation">Installation</NavLink>
      </nav>
      <a className="contribute-button" href="https://github.com/obaidur-0090" target="_blank" rel="noreferrer">
        <span>My Git</span><Icon name="arrow" size={17} />
      </a>
    </div>
  </header>
)

const Footer = () => (
  <footer className="site-footer">
    <div className="footer-inner">
      <div>
        <Link className="brand footer-brand" to="/">
          <span className="brand-mark"><Icon name="spark" size={19} /></span>
          <span>appverse<span className="brand-period">.</span></span>
        </Link>
        <p>Find a little more of what works for you.</p>
      </div>
      <div className="footer-links">
        <Link to="/apps">Explore apps</Link>
        <Link to="/installation">Your installations</Link>
        <a href="https://github.com/ProgrammingHero1/B12-A08-Hero-Apps" target="_blank" rel="noreferrer">GitHub</a>
      </div>
      <span className="footer-copy">© 2025 AppVerse. Made for curious minds.</span>
    </div>
  </footer>
)

const Rating = ({ value }) => (
  <span className="rating-value"><Icon name="star" size={15} /><span>{value.toFixed(1)}</span></span>
)

const AppCard = ({ app }) => (
  <Link className="app-card" to={`/apps/${app.id}`}>
    <div className="app-card-image">
      <img src={app.image} alt="" />
      <span className="card-open"><Icon name="arrow" size={18} /></span>
    </div>
    <div className="app-card-content">
      <div className="app-card-heading">
        <div>
          <h3>{app.title}</h3>
          <p>{app.companyName}</p>
        </div>
        <Rating value={app.ratingAvg} />
      </div>
      <div className="app-card-meta">
        <span><Icon name="download" size={15} />{formatDownloads(app.downloads)} downloads</span>
        <span>{app.size} MB</span>
      </div>
    </div>
  </Link>
)

const HomePage = () => {
  const { apps } = useOutletContext()
  const featuredApps = [...apps].sort((first, second) => second.downloads - first.downloads).slice(0, 8)

  return (
    <>
      <section className="hero-section page-container">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> A better kind of app store</span>
          <h1>Good apps make<br />everyday <span>better.</span></h1>
          <p>Discover thoughtful apps for the way you live, work, and unwind. Your next favorite is just around the corner.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="https://www.apple.com/app-store/" target="_blank" rel="noreferrer">App Store <Icon name="arrow" size={18} /></a>
            <a className="button button-secondary" href="https://play.google.com/store" target="_blank" rel="noreferrer">Play Store <Icon name="arrow" size={17} /></a>
          </div>
          <Link className="hero-explore-link" to="/apps">Explore the app collection <Icon name="arrow" size={15} /></Link>
          <div className="hero-proof">
            <div className="avatar-stack" aria-hidden="true"><span>A</span><span>M</span><span>J</span><span>+</span></div>
            <p><strong>Made for people like you</strong><br />A hand-picked collection to explore</p>
          </div>
        </div>
        <div className="hero-art">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="hero-note note-top"><span className="note-icon lavender"><Icon name="spark" size={19} /></span><span><strong>Curated for you</strong><small>Discover something new</small></span></div>
          <img src={heroImage} alt="A phone showing a collection of learning apps" />
          <div className="hero-note note-bottom"><span className="note-icon mint"><Icon name="check" size={19} /></span><span><strong>Find your next favorite</strong><small>{apps.length} apps and counting</small></span></div>
          <span className="hero-decor decor-star"><Icon name="spark" size={22} /></span>
          <span className="hero-decor decor-spark"><Icon name="spark" size={23} /></span>
        </div>
      </section>

      <section className="stats-band">
        <div className="stats-inner page-container">
          <div className="stat-item"><span className="stat-icon lavender"><Icon name="spark" size={21} /></span><div><strong>{apps.length}</strong><span>Handpicked apps</span></div></div>
          <div className="stat-divider" />
          <div className="stat-item"><span className="stat-icon peach"><Icon name="download" size={21} /></span><div><strong>15M+</strong><span>Happy downloads</span></div></div>
          <div className="stat-divider" />
          <div className="stat-item"><span className="stat-icon mint"><Icon name="star" size={21} /></span><div><strong>4.7<span className="stat-star">★</span></strong><span>Average app rating</span></div></div>
        </div>
      </section>

      <section className="featured-section page-container">
        <div className="section-heading">
          <div><span className="eyebrow">A few good ones</span><h2>Popular right now<span className="brand-period">.</span></h2><p>Apps people are loving lately. Maybe you will too.</p></div>
          <Link className="text-link" to="/apps">Show All <Icon name="arrow" size={17} /></Link>
        </div>
        <div className="app-grid">{featuredApps.map((app) => <AppCard key={app.id} app={app} />)}</div>
        <div className="mobile-show-all"><Link className="button button-secondary" to="/apps">See all apps <Icon name="arrow" size={17} /></Link></div>
      </section>

      <section className="discover-cta page-container">
        <div className="cta-spark"><Icon name="spark" size={26} /></div>
        <div><span className="eyebrow">Your next favorite is out there</span><h2>Ready to find your app?</h2><p>Browse the whole collection and see what feels right.</p></div>
        <Link className="button button-light" to="/apps">Browse all apps <Icon name="arrow" size={18} /></Link>
      </section>
    </>
  )
}

const AppsPage = () => {
  const { apps } = useOutletContext()
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [sortOrder, setSortOrder] = useState('default')
  const isSearching = query !== appliedQuery

  useEffect(() => {
    if (query === appliedQuery) return undefined
    const timer = window.setTimeout(() => {
      setAppliedQuery(query)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [query, appliedQuery])

  const filteredApps = useMemo(() => {
    const normalizedQuery = appliedQuery.trim().toLowerCase()
    const matches = apps.filter((app) => app.title.toLowerCase().includes(normalizedQuery))
    if (sortOrder === 'high-low') return matches.sort((first, second) => second.downloads - first.downloads)
    if (sortOrder === 'low-high') return matches.sort((first, second) => first.downloads - second.downloads)
    return matches
  }, [apps, appliedQuery, sortOrder])

  return (
    <section className="catalog-page page-container">
      <div className="catalog-intro">
        <span className="eyebrow"><span className="eyebrow-dot" /> The AppVerse collection</span>
        <h1>Find your <span>kind</span> of app.</h1>
        <p>From little daily helpers to new ways to unwind, there’s something here for you.</p>
      </div>
      <div className="catalog-toolbar">
        <div className="catalog-count"><strong>{apps.length}</strong> apps in our collection</div>
        <div className="catalog-controls">
          <label className="search-field">
            <Icon name="search" size={19} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search apps..." aria-label="Search apps by title" />
            {query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><Icon name="close" size={16} /></button>}
          </label>
          <label className="sort-field">
            <span className="sr-only">Sort by downloads</span>
            <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
              <option value="default">Sort: featured</option>
              <option value="high-low">Downloads: high to low</option>
              <option value="low-high">Downloads: low to high</option>
            </select>
          </label>
        </div>
      </div>
      <div className="catalog-results" aria-live="polite">
        {isSearching ? (
          <div className="search-loading"><span className="spinner" /><span>Looking for apps...</span></div>
        ) : filteredApps.length ? (
          <div className="app-grid">{filteredApps.map((app) => <AppCard key={app.id} app={app} />)}</div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon"><Icon name="search" size={26} /></span>
            <h2>No app found</h2>
            <p>We couldn't find an app matching "{appliedQuery}". Try another search.</p>
            <button className="button button-secondary" type="button" onClick={() => setQuery('')}>Clear search</button>
          </div>
        )}
      </div>
    </section>
  )
}

const DetailPage = () => {
  const { appId } = useParams()
  const navigate = useNavigate()
  const { apps, installedIds, installApp } = useOutletContext()
  const app = apps.find((item) => item.id === Number(appId))

  if (!app) {
    return <NotFoundPage title="App not found" message="That app may have moved, or the link might be incomplete." />
  }

  const isInstalled = installedIds.includes(app.id)

  return (
    <section className="detail-page page-container">
      <button className="back-link" type="button" onClick={() => navigate(-1)}><Icon name="back" size={16} /> Back to apps</button>
      <div className="detail-overview">
        <div className="detail-app-image"><img src={app.image} alt={`${app.title} app icon`} /></div>
        <div className="detail-app-info">
          <span className="eyebrow">App details</span>
          <h1>{app.title}</h1>
          <p className="detail-company">{app.companyName}</p>
          <p className="detail-summary">{app.description}</p>
          <div className="detail-metrics">
            <div><Rating value={app.ratingAvg} /><span>Average rating</span></div>
            <div><strong>{formatDownloads(app.downloads)}</strong><span>Downloads</span></div>
            <div><strong>{formatNumber(app.reviews)}</strong><span>Reviews</span></div>
          </div>
          <button className={`button install-button ${isInstalled ? 'installed' : 'button-primary'}`} type="button" disabled={isInstalled} onClick={() => installApp(app)}>
            <Icon name={isInstalled ? 'check' : 'download'} size={18} />{isInstalled ? 'Installed' : 'Install app'}
          </button>
        </div>
        <div className="detail-size-card"><span>App size</span><strong>{app.size} MB</strong><small>Version 2.4.0</small></div>
      </div>

      <section className="rating-section">
        <div className="detail-section-heading"><div><span className="eyebrow">What people think</span><h2>Ratings & reviews</h2></div><span className="reviews-total">{formatNumber(app.reviews)} ratings</span></div>
        <div className="rating-chart-card">
          <div className="chart-score"><strong>{app.ratingAvg.toFixed(1)}</strong><Rating value={app.ratingAvg} /><span>out of 5</span></div>
          <div className="chart-divider" />
          <div className="chart-wrap">
            <Suspense fallback={<div className="chart-loading"><span className="spinner" />Loading rating chart...</div>}>
              <RatingChart ratings={app.ratings} />
            </Suspense>
          </div>
        </div>
      </section>

      <section className="description-section">
        <span className="eyebrow">A little more about it</span>
        <h2>Made to fit your everyday.</h2>
        <p>{app.description}</p>
        <p>Simple to get started with and easy to make your own, {app.title} is ready whenever you are. Download it today and find a new favorite part of your routine.</p>
      </section>
    </section>
  )
}

const InstallationPage = () => {
  const { apps, installedIds, uninstallApp } = useOutletContext()
  const installedApps = apps.filter((app) => installedIds.includes(app.id))

  return (
    <section className="installation-page page-container">
      <div className="catalog-intro">
        <span className="eyebrow"><span className="eyebrow-dot" /> Your personal library</span>
        <h1>My <span>installations.</span></h1>
        <p>All your downloaded favorites, together in one place.</p>
      </div>
      <div className="installation-toolbar"><strong>{installedApps.length} {installedApps.length === 1 ? 'app' : 'apps'} installed</strong><Link className="text-link" to="/apps">Find another app <Icon name="arrow" size={17} /></Link></div>
      {installedApps.length ? (
        <div className="installation-list">
          {installedApps.map((app) => (
            <article className="installation-card" key={app.id}>
              <img src={app.image} alt="" />
              <div className="installation-info"><h2>{app.title}</h2><p>{app.companyName}</p><span><Rating value={app.ratingAvg} /> <span className="installation-downloads"><Icon name="download" size={14} /> {formatDownloads(app.downloads)}</span></span></div>
              <button className="button uninstall-button" type="button" onClick={() => uninstallApp(app)}>Uninstall</button>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state installation-empty">
          <span className="empty-icon"><Icon name="download" size={26} /></span>
          <h2>Your library is ready for a first pick.</h2>
          <p>When you install an app, you’ll find it here. Explore the collection to get started.</p>
          <Link className="button button-primary" to="/apps">Explore apps <Icon name="arrow" size={17} /></Link>
        </div>
      )}
    </section>
  )
}

const NotFoundPage = ({ title = 'This page wandered off.', message = "The page you're looking for doesn't seem to be here." }) => (
  <section className="not-found-page page-container">
    <img src={errorImage} alt="" />
    <span className="eyebrow">A little detour</span>
    <h1>{title}</h1>
    <p>{message}</p>
    <Link className="button button-primary" to="/">Back to home <Icon name="arrow" size={17} /></Link>
  </section>
)

export { AppShell, HomePage, AppsPage, DetailPage, InstallationPage, NotFoundPage }
