import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-neutral-text text-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center text-center space-y-8">
          {/* TeachTape Logo */}
          <div className="mb-4">
            <Image
              src="/teachtape-logo-full.png"
              alt="TeachTape"
              width={200}
              height={60}
              className="h-12 w-auto"
            />
          </div>
          
          {/* Tagline */}
          <div>
            <p className="text-lg font-medium text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Real Athletes. Real Coaches. Real Results. 
              <br />
              Where Athletes Coach Athletes.
            </p>
          </div>
          
          {/* Links */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
            <Link 
              href="/faq"
              className="text-gray-300 hover:text-white transition-colors duration-200 underline underline-offset-4 hover:underline-offset-2"
            >
              FAQ
            </Link>
            <Link 
              href="/terms"
              className="text-gray-300 hover:text-white transition-colors duration-200 underline underline-offset-4 hover:underline-offset-2"
            >
              Terms of Service
            </Link>
            <Link 
              href="/privacy"
              className="text-gray-300 hover:text-white transition-colors duration-200 underline underline-offset-4 hover:underline-offset-2"
            >
              Privacy Policy
            </Link>
          </div>
          
          {/* Copyright */}
          <div className="pt-8 border-t border-gray-700 w-full">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} TeachTape. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}