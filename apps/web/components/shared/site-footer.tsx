import Link from 'next/link'

const footerLinks = [
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/contact', label: 'Contact' },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 py-8 px-4 sm:px-6 lg:px-24 xl:px-32 2xl:px-40">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-white/40">
          © 2026 VIBE Media Lab. All rights reserved.
        </p>
        <div className="flex gap-6">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-white/40 hover:text-white/60"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
