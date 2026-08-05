import { motion } from "framer-motion";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { COMPARISON_DATA } from "@/constants/landingData";

export const Comparison = () => {
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

  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.6, ease: "easeInOut" },
    },
  };

  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-12 md:mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Traditional vs. GuardianLink
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            See how GuardianLink transforms child safety and family reunification.
          </p>
        </motion.div>

        {/* Comparison Grid */}
        <div className="hidden lg:block">
          <motion.div
            className="grid grid-cols-3 gap-8 mb-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            {/* Headers */}
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900">Traditional Process</h3>
            </div>
            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-primary mt-1" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                GuardianLink
              </h3>
            </div>
          </motion.div>

          {/* Comparison Rows */}
          <motion.div
            className="space-y-4"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {COMPARISON_DATA.map((item, index) => (
              <motion.div
                key={index}
                variants={rowVariants}
                className="grid grid-cols-3 gap-8 items-center"
              >
                {/* Traditional */}
                <motion.div
                  className="p-6 rounded-2xl border border-red-200 bg-red-50 hover:shadow-lg transition-shadow"
                  whileHover={{ y: -4 }}
                >
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-1" />
                    <p className="text-gray-700">{item.traditional}</p>
                  </div>
                </motion.div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <ArrowRight className="w-6 h-6 text-primary" />
                  </motion.div>
                </div>

                {/* GuardianLink */}
                <motion.div
                  className="p-6 rounded-2xl border border-green-200 bg-green-50 hover:shadow-lg transition-shadow"
                  whileHover={{ y: -4 }}
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                    <p className="text-gray-700">{item.guardianLink}</p>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Mobile Comparison */}
        <motion.div
          className="lg:hidden space-y-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {COMPARISON_DATA.map((item, index) => (
            <motion.div
              key={index}
              variants={rowVariants}
              className="space-y-3"
            >
              {/* Traditional */}
              <div className="p-4 rounded-2xl border border-red-200 bg-red-50">
                <div className="flex items-start gap-3 mb-2">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="font-semibold text-gray-900 text-sm">Traditional</p>
                </div>
                <p className="text-sm text-gray-700 pl-8">{item.traditional}</p>
              </div>

              {/* Arrow */}
              <div className="flex justify-center py-2">
                <ArrowRight className="w-5 h-5 text-primary transform rotate-90" />
              </div>

              {/* GuardianLink */}
              <div className="p-4 rounded-2xl border border-green-200 bg-green-50">
                <div className="flex items-start gap-3 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="font-semibold text-gray-900 text-sm">GuardianLink</p>
                </div>
                <p className="text-sm text-gray-700 pl-8">{item.guardianLink}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <p className="text-lg text-gray-600 mb-6">
            Ready to upgrade your child safety strategy?
          </p>
          <motion.button
            className="px-8 py-4 bg-gradient-to-r from-primary to-blue-700 text-white font-semibold rounded-lg hover:shadow-xl transition-shadow"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Schedule a Demo
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};
