export default function NavBar() {
  return (
    <header className="flex items-center justify-between border-b border-gray-200 px-10 py-5">
      <div className="flex items-center gap-3">
        <div className="h-6 w-6 border-2 border-black" />
        <span className="text-lg font-bold tracking-wide">MEMOBOARD</span>
      </div>

      <nav className="hidden items-center gap-8 text-sm md:flex">
        <a href="#" className="hover:text-black">How it Works</a>
        <a href="#" className="hover:text-black">Pricing</a>
        <a href="#" className="hover:text-black">Examples</a>
        <a href="#" className="hover:text-black">Blog</a>
      </nav>

      <div className="flex items-center gap-4">
        <a href="#" className="text-sm">Login</a>
        <div className="h-9 w-9 rounded-full bg-gray-100" />
      </div>
    </header>
  )
}
