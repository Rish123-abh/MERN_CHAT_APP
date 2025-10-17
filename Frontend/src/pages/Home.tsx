import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import logo from "../assets/samvaadLogo.png";
import ChatInterface from "./ChatInterface";
import { BiVideo } from "react-icons/bi";
import { MdDarkMode } from "react-icons/md";
import { CiLight } from "react-icons/ci";
import { useTheme } from "../context/useTheme";
import { dark } from "@clerk/themes";

const Home = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div
      className={`min-h-screen transition-all duration-300 ${
        theme === "light"
          ? "bg-gradient-to-br from-blue-50 to-indigo-100 text-black"
          : "bg-gradient-to-br from-gray-900 to-black text-white"
      }`}
    >
      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 h-20 flex items-center shadow-md border-b transition-all duration-300 ${
          theme === "light"
            ? "bg-white border-gray-200 text-black"
            : "bg-gray-900 border-gray-700 text-white"
        }`}
      >
        <div className="mx-auto w-full px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <img src={logo} alt="Samvaad Logo" className="h-30 w-30" />

          <div className="flex items-center space-x-4">
            {theme === "dark" ? (
              <CiLight className="h-7 w-7 cursor-pointer" onClick={toggleTheme} />
            ) : (
              <MdDarkMode className="h-7 w-7 cursor-pointer" onClick={toggleTheme} />
            )}

            <SignedOut>
              <SignInButton mode="modal">
                <button
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    theme === "light"
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-indigo-500 text-white hover:bg-indigo-600"
                  }`}
                >
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>

            <SignedIn>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-10 h-10",
                  },
                }}
              />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 overflow-hidden">
        <SignedOut>
          {/* Landing Page for Signed Out Users */}
          <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <h1
                className={`text-4xl font-extrabold sm:text-5xl md:text-6xl ${
                  theme === "light" ? "text-gray-900" : "text-white"
                }`}
              >
                <span className="block">Connect & Chat</span>
                <span
                  className={`block ${
                    theme === "light" ? "text-indigo-600" : "text-indigo-400"
                  }`}
                >
                  Seamlessly
                </span>
              </h1>

              <p
                className={`mt-4 max-w-2xl mx-auto text-lg ${
                  theme === "light" ? "text-gray-600" : "text-gray-300"
                }`}
              >
                Join conversations, share moments, and stay connected with friends and
                communities in real time.
              </p>

              <div className="mt-8 flex justify-center">
                <SignInButton mode="modal">
                  <button
                    className={`px-8 py-3 rounded-md text-base font-medium transition-colors ${
                      theme === "light"
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "bg-indigo-500 text-white hover:bg-indigo-600"
                    }`}
                  >
                    Get Started Free
                  </button>
                </SignInButton>
              </div>
            </div>

            {/* Features Section */}
           <div className="mt-10">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Real-time Messaging */}
        <div className="pt-6">
          <div className={`flow-root h-full rounded-lg  px-6 pb-8 ${theme === "light" ? "bg-white" : "bg-gray-900"}`}>
            <div className="-mt-6">
              <div className="inline-flex items-center justify-center rounded-md bg-indigo-500 p-3 shadow-lg">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className={`mt-8 text-lg font-medium tracking-tight ${theme==="light"? "text-gray-900":"text-white"}`}>
                Real-time Messaging
              </h3>
              <p className={`mt-5 text-base text-gray-500 ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>
                Instant messaging with real-time delivery and read receipts.
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Secure & Private */}
        <div className="pt-6">
          <div className={`flow-root h-full rounded-lg ${theme === "light" ? "bg-white" : "bg-gray-900"} px-6 pb-8`}>
            <div className="-mt-6">
              <div className="inline-flex items-center justify-center rounded-md bg-indigo-500 p-3 shadow-lg">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className={`mt-8 text-lg font-medium tracking-tight ${theme==="light"? "text-gray-900":"text-white"}"`}>
                Secure & Private
              </h3>
              <p className="mt-5 text-base text-gray-500">
                End-to-end encryption keeps your conversations private and secure.
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: Video Call */}
        <div className="pt-6">
          <div className={`flow-root h-full rounded-lg  ${theme === "light" ? "bg-white" : "bg-gray-900"} px-6 pb-8"`}>
            <div className="-mt-6">
              <div className="inline-flex items-center justify-center rounded-md bg-indigo-500 p-3 shadow-lg">
                <BiVideo className="h-6 w-6 text-white" />
              </div>
              <h3 className={`mt-8 text-lg font-medium tracking-tight ${theme==="light"? "text-gray-900":"text-white"}`}>
                Video call
              </h3>
              <p className="mt-5 text-base text-gray-500">
                Video call with friends effortlessly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
          </div>
        </SignedOut>

        <SignedIn>
          <div className="overflow-x-hidden">
            <ChatInterface />
          </div>
        </SignedIn>
      </main>
    </div>
  );
};

export default Home;
