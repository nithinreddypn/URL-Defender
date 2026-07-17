import { createBrowserRouter, Navigate } from "react-router-dom";
import RootLayout from "./layouts/RootLayout";
import MarketingLayout from "./layouts/MarketingLayout";
import AuthLayout from "./layouts/AuthLayout";
import AppLayout from "./layouts/AppLayout";

import IndexPage from "./pages/marketing/IndexPage";
import FeaturesPage from "./pages/marketing/FeaturesPage";
import HowItWorksPage from "./pages/marketing/HowItWorksPage";
import PricingPage from "./pages/marketing/PricingPage";
import PrivacyPage from "./pages/marketing/PrivacyPage";
import TermsPage from "./pages/marketing/TermsPage";

import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import GoogleCallbackPage from "./pages/auth/GoogleCallbackPage";

import HomePage from "./pages/app/HomePage";
import AlertsPage from "./pages/app/AlertsPage";
import ProfilePage from "./pages/app/ProfilePage";
import ScanPage from "./pages/app/ScanPage";
import ScanResultPage from "./pages/app/ScanResultPage";
import SettingsPage from "./pages/app/SettingsPage";

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <MarketingLayout />,
        children: [
          {
            path: "/",
            element: <IndexPage />,
            handle: { title: "URL Defender — Scan any link for phishing and malware" },
          },
          {
            path: "/features",
            element: <FeaturesPage />,
            handle: { title: "Features — URL Defender" },
          },
          {
            path: "/how-it-works",
            element: <HowItWorksPage />,
            handle: { title: "How it works — URL Defender" },
          },
          {
            path: "/pricing",
            element: <PricingPage />,
            handle: { title: "Pricing — URL Defender" },
          },
          {
            path: "/privacy",
            element: <PrivacyPage />,
            handle: { title: "Privacy Policy — URL Defender" },
          },
          {
            path: "/terms",
            element: <TermsPage />,
            handle: { title: "Terms of Service — URL Defender" },
          },
        ],
      },
      {
        element: <AuthLayout />,
        children: [
          {
            path: "/login",
            element: <LoginPage />,
            handle: { title: "Sign in — URL Defender" },
          },
          {
            path: "/signup",
            element: <SignupPage />,
            handle: { title: "Create account — URL Defender" },
          },
          {
            path: "/forgot-password",
            element: <ForgotPasswordPage />,
            handle: { title: "Forgot password — URL Defender" },
          },
          {
            path: "/reset-password",
            element: <ResetPasswordPage />,
            handle: { title: "Reset password — URL Defender" },
          },
          {
            path: "/verify-email",
            element: <VerifyEmailPage />,
            handle: { title: "Verify your email — URL Defender" },
          },
        ],
      },
      {
        element: <AppLayout />,
        children: [
          {
            path: "/home",
            element: <HomePage />,
            handle: { title: "Dashboard — URL Defender" },
          },
          {
            path: "/alerts",
            element: <AlertsPage />,
            handle: { title: "Alerts & History — URL Defender" },
          },
          {
            path: "/profile",
            element: <ProfilePage />,
            handle: { title: "Profile — URL Defender" },
          },
          {
            path: "/scan",
            element: <ScanPage />,
            handle: { title: "Scan URL — URL Defender" },
          },
          {
            path: "/scan/:id/result",
            element: <ScanResultPage />,
            handle: { title: "Scan report — URL Defender" },
          },
          {
            path: "/settings",
            element: <SettingsPage />,
            handle: { title: "Settings — URL Defender" },
          },
        ],
      },
      {
        path: "/auth/google/callback",
        element: <GoogleCallbackPage />,
        handle: { title: "Signing you in — URL Defender" },
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
