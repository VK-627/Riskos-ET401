import { Link, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import logo from "../assets/riskosalt.png";

const NavLink = ({ children, to }) => (
  <Link
    to={to}
    className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100"
  >
    {children}
  </Link>
);

export function Navbar() {
  const { isLoggedIn, logout, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and Links */}
          <div className="flex items-center space-x-4">
            <Link to="/">
              <img className="h-10 w-auto" src={logo} alt="Riskos Logo" />
            </Link>

             {/* Navigation Links */}
             <div className="hidden sm:flex sm:space-x-6">
              <NavLink to="/news">News</NavLink>
              <NavLink to="/assessment">Risk Analysis </NavLink>
              <NavLink to="/learn">Learn</NavLink>
              <NavLink to="/about">About Us</NavLink>
            </div>
          </div>

          {/* Right side - Auth Buttons */}
          <div className="flex items-center space-x-4">
            {isLoggedIn ? (
              <>
                <span className="text-sm font-medium text-gray-600">
                  Welcome, {user?.name || "User"}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-md"
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
