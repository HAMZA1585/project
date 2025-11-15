import { useState } from "react";
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser } from '../store/slices/authSlice';
import { NavLink } from "react-router-dom";
import {
  HomeIcon,
  CubeIcon,
  TagIcon,
  MapPinIcon,
  ClockIcon,
  UserCircleIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ArrowLeftOnRectangleIcon,
  EyeIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/outline";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dispatch = useDispatch();
  const handleLogout = () => dispatch(logoutUser());
  const { user } = useSelector(state => state.auth);

  const toggleSidebar = () => setCollapsed(!collapsed);
  const toggleMobileSidebar = () => setMobileOpen(!mobileOpen);

  const userRole = user?.role || 'user';
  
          const menuItems = [
            { name: "Dashboard", icon: <HomeIcon className="w-6 h-6" />, path: "/dashboard" },
    { name: "Visualization", icon: <EyeIcon className="w-6 h-6" />, path: "/visualization" },
    { name: "AI Curation", icon: <SparklesIcon className="w-6 h-6" />, path: "/curation" },
    { name: "Advanced Search", icon: <MagnifyingGlassIcon className="w-6 h-6" />, path: "/search" },
    { name: "Archive", icon: <ArchiveBoxIcon className="w-6 h-6" />, path: "/archive" },
    { name: "Report", icon: <CubeIcon className="w-6 h-6" />, path: "/report" },
    ...(userRole === 'admin' ? [{ name: "Admin", icon: <UserCircleIcon className="w-6 h-6" />, path: "/admin" }] : []),
    // { name: "Categories", icon: <TagIcon className="w-6 h-6" />, path: "/categories" },
    // { name: "Locations", icon: <MapPinIcon className="w-6 h-6" />, path: "/locations" },
    // { name: "History", icon: <ClockIcon className="w-6 h-6" />, path: "/history" },
    // { name: "Assignee", icon: <UserCircleIcon className="w-6 h-6" />, path: "/assignee" },
  ];

  return (
    <>
      {/* Mobile sidebar toggle button */}
      <button
        onClick={toggleMobileSidebar}
        className="md:hidden fixed top-4 left-4 z-50 p-3 rounded-xl bg-white text-gray-800 shadow-lg hover:shadow-xl border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:translate-x-1 hover:scale-105"
      >
        {mobileOpen ? (
          <ChevronDoubleLeftIcon className="w-5 h-5" />
        ) : (
          <ChevronDoubleRightIcon className="w-5 h-5" />
        )}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed md:relative z-40 h-screen transition-all duration-300 ease-in-out flex flex-col justify-between
        ${collapsed ? "w-20" : "w-72"} 
        ${mobileOpen ? "left-0" : "-left-full md:left-0"}
        bg-gray-900 border-r border-gray-200 shadow-lg`}
      >
        {/* Top section */}
        <div>
          {/* Logo/Header */}
          <div className={`flex items-center justify-between h-20 ${collapsed ? "px-3" : "px-6"}`}>
            {!collapsed ? (
              <span className="text-white font-bold text-2xl">NewsDesk</span>
            ) : (
              <span className="text-white font-bold text-xl mx-auto">N</span>
            )}
            <button
              onClick={toggleSidebar}
              className="hidden md:block text-gray-400 hover:text-white p-2 rounded-xl hover:bg-gray-700 transition-all duration-200 hover:scale-105 hover:translate-x-1"
            >
              {collapsed ? (
                <ChevronDoubleRightIcon className="w-5 h-5" />
              ) : (
                <ChevronDoubleLeftIcon className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="px-2 py-4 space-y-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center ${
                    collapsed ? "justify-center px-3 py-3" : "px-5 py-3"
                  } rounded-xl transition-all duration-200 group hover:translate-x-1
                  ${
                    isActive
                      ? "bg-gray-700 text-white shadow-sm"
                      : "text-gray-400 hover:bg-gray-700 hover:text-white hover:shadow-sm"
                  }`
                }
              >
                <span className={`${!collapsed ? "mr-4" : ""} group-hover:scale-110 transition-transform duration-200`}>{item.icon}</span>
                {!collapsed && <span className="text-lg font-medium">{item.name}</span>}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom Logout Button */}
        <div className="px-4 py-4">
          <button
            className={`flex items-center w-full justify-center ${
              collapsed ? "py-3" : "py-3 px-4"
            } text-lg text-gray-400 hover:text-white bg-gray-900 hover:bg-red-600 font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-105 hover:translate-x-1 group`}
            onClick={handleLogout}
          >
            <ArrowLeftOnRectangleIcon className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
            {!collapsed && <span className="ml-3">Logout</span>}
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
