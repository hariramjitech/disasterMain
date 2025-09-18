import React, { useState } from "react";
import {
  FaHome,
  FaPhoneAlt,
  FaInfoCircle,
  FaBars,
  FaTimes,
  FaMapMarkedAlt,
} from "react-icons/fa";
import { RiChatPrivateFill } from "react-icons/ri";
import { Link, useLocation } from "react-router-dom";

export default function SideBar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => setIsOpen(!isOpen);

  const navItems = [
    { path: "/", icon: <FaHome />, label: "Home" },
    { path: "/emergency", icon: <FaPhoneAlt />, label: "Emergency" },
    { path: "/p2pchat", icon: <RiChatPrivateFill />, label: "P2P Chat" },
    { path: "/map", icon: <FaMapMarkedAlt />, label: "Offline Map" },
    { path: "/capalerts", icon: <FaMapMarkedAlt />, label: "CAP Alerts Map" },
    {path: "/triphelp", icon: <FaMapMarkedAlt />, label: "Trip Help" },
    { path: "/about", icon: <FaInfoCircle />, label: "About" },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleSidebar}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-blue-600 text-white shadow-lg"
        aria-label="Toggle menu"
      >
        {isOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
      </button>

      {/* Overlay for Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static top-0 left-0 h-full md:h-screen w-64 bg-gradient-to-b from-blue-800 to-blue-900
          text-white shadow-xl z-40 transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="flex flex-col h-full p-6">
          {/* Logo */}
          <h2 className="text-2xl font-bold mb-8 flex items-center">
            <span className="bg-white text-blue-800 rounded-lg p-1 mr-2">🚨</span>
            Disaster Manager
          </h2>

          {/* Navigation */}
          <nav className="flex-1 space-y-2 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200
                  ${
                    location.pathname === item.path
                      ? "bg-blue-700 shadow-md font-semibold border-l-4 border-white"
                      : "text-blue-200 hover:bg-blue-700 hover:shadow-md"
                  }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-blue-700 text-sm text-blue-300">
            <p>Stay safe and prepared</p>
          </div>
        </div>
      </aside>
    </>
  );
}