import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { FOOTER_LINKS, SOCIAL_LINKS } from "@/constants/landingData";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeInOut" },
    },
  };

  return (
    <footer className="bg-gray-900 text-gray-400 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <motion.div
          className="py-12 md:py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* Brand */}
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">GuardianLink</span>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Protecting children and reuniting families with AI-powered safety.
            </p>
            {/* Social Icons */}
            <div className="flex gap-4">
              {SOCIAL_LINKS.map((social, index) => {
                const Icon = social.icon;
                return (
                  <motion.a
                    key={index}
                    href={social.href}
                    className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-primary transition-all duration-300"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon className="w-5 h-5" />
                  </motion.a>
                );
              })}
            </div>
          </motion.div>

          {/* Links */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <motion.div
              key={title}
              variants={itemVariants}
              className="lg:col-span-1"
            >
              <h4 className="text-white font-semibold mb-4">{title}</h4>
              <ul className="space-y-3">
                {links.map((link, index) => (
                  <li key={index}>
                    <a
                      href={link.href}
                      className="text-sm text-gray-500 hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>

        {/* Divider */}
        <div className="border-t border-gray-800"></div>

        {/* Bottom Section */}
        <motion.div
          className="py-8 flex flex-col md:flex-row items-center justify-between gap-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <p className="text-sm text-gray-500">
            © {currentYear} GuardianLink. All rights reserved.
          </p>

          {/* Additional Links */}
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-white transition-colors">
              Status Page
            </a>
            <a href="#" className="hover:text-white transition-colors">
              System Status
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Support Center
            </a>
          </div>

          {/* Language/Region Selector */}
          <div className="flex gap-4">
            <button className="px-3 py-1.5 text-sm rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors">
              English
            </button>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};
