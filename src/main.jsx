import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell, AppsPage, DetailPage, HomePage, InstallationPage, NotFoundPage } from './App.jsx'

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'apps', element: <AppsPage /> },
      { path: 'apps/:appId', element: <DetailPage /> },
      { path: 'installation', element: <InstallationPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
