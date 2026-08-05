import { motion } from "framer-motion";
import { ArrowRight, Shield, MapPin, Zap, Users } from "lucide-react";

export const Hero = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeInOut" },
    },
  };

  return (
    <section id="hero" className="pt-32 md:pt-40 pb-16 md:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col"
          >
            {/* Badge */}
            <motion.div variants={itemVariants} className="mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/10 border border-secondary/30 rounded-full">
                <Zap className="w-4 h-4 text-secondary" />
                <span className="text-sm font-semibold text-secondary">Protecting Children Every Day</span>
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6"
            >
              Every Child Deserves a
              <span className="gradient-text"> Safe Way Home</span>
            </motion.h1>

            {/* Description */}
            <motion.p
              variants={itemVariants}
              className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed max-w-lg"
            >
              GuardianLink uses AI-powered face recognition and real-time coordination to reunite missing children with their families in minutes, not hours.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 mb-12"
            >
              <motion.button
                className="px-8 py-4 bg-gradient-to-r from-primary to-blue-700 text-white font-semibold rounded-lg hover:shadow-xl transition-shadow flex items-center justify-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Register Your Child
                <ArrowRight className="w-5 h-5" />
              </motion.button>
              <motion.button
                className="px-8 py-4 border-2 border-primary text-primary font-semibold rounded-lg hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Learn How It Works
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap gap-6 text-sm text-gray-600"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-secondary rounded-full"></div>
                <span>AI-Powered Verification</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-secondary rounded-full"></div>
                <span>Privacy Protected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-secondary rounded-full"></div>
                <span>24/7 Support</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Illustration */}
          <motion.div
            className="relative h-96 md:h-full min-h-96"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-blue-100/5 to-transparent rounded-2xl blur-3xl"></div>

            {/* Premium UI Mockup */}
            <div className="relative h-full flex flex-col items-center justify-center">
              <div className="w-full max-w-sm">
                {/* Device Frame */}
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
                  {/* Phone Header */}
                  <div className="bg-gradient-to-r from-primary to-blue-700 text-white px-6 py-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className="w-5 h-5" />
                      <span className="font-semibold text-sm">GuardianLink</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-4">
                    {/* Feature 1 */}
                    <motion.div
                      className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">AI Recognition</p>
                        <p className="text-xs text-gray-600">Instant verification</p>
                      </div>
                    </motion.div>

                    {/* Feature 2 */}
                    <motion.div
                      className="flex items-start gap-3 p-3 rounded-lg bg-secondary/10 border border-secondary/20"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                    >
                      <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-secondary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Live Location</p>
                        <p className="text-xs text-gray-600">Real-time tracking</p>
                      </div>
                    </motion.div>

                    {/* Feature 3 */}
                    <motion.div
                      className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 border border-purple-100"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                    >
                      <div className="w-10 h-10 rounded-lg bg-purple-200/50 flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Citizen Reports</p>
                        <p className="text-xs text-gray-600">Community support</p>
                      </div>
                    </motion.div>

                    {/* Feature 4 */}
                    <motion.div
                      className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-100"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
                    >
                      <div className="w-10 h-10 rounded-lg bg-green-200/50 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Emergency Response</p>
                        <p className="text-xs text-gray-600">Instant alert system</p>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
