export function Footer() {
  return (
    <footer className="border-t bg-muted/50 py-8 mt-16">
      <div className="container px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="h-6 w-6 rounded bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <span className="text-white font-bold text-xs">BL</span>
              </div>
              <span className="font-bold gradient-text">Bhu-Local</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Discover India like never before with AI-powered travel planning and local community insights.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Safety Guidelines
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Community</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Become a Guardian
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  For Businesses
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Local Partners
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Bhu-Local. Made with ❤️ for incredible India.</p>
        </div>
      </div>
    </footer>
  )
}
