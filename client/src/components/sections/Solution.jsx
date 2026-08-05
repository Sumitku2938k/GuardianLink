import { motion } from "framer-motion";
import { CheckCircle2, Zap } from "lucide-react";
import { SOLUTIONS_DATA, SOLUTION_FEATURES } from "@/constants/landingData";

export const Solution = () => {
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

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeInOut" },
    },
  };

  const colorStyles = {
    blue: { bg: "bg-blue-50", icon: "text-blue-600", border: "border-blue-200" },
    green: { bg: "bg-green-50", icon: "text-green-600", border: "border-green-200" },
    purple: { bg: "bg-purple-50", icon: "text-purple-600", border: "border-purple-200" },
    orange: { bg: "bg-orange-50", icon: "text-orange-600", border: "border-orange-200" },
    red: { bg: "bg-red-50", icon: "text-red-600", border: "border-red-200" },
    cyan: { bg: "bg-cyan-50", icon: "text-cyan-600", border: "border-cyan-200" },
  };

  return (
    <section id="solution" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/10 border border-secondary/30 rounded-full mb-4">
            <Zap className="w-4 h-4 text-secondary" />
            <span className="text-sm font-semibold text-secondary">The Solution</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Introducing GuardianLink
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A unified platform that leverages AI, real-time communication, and community support to reunite children with families in minutes.
          </p>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16 items-start mb-12 md:mb-16">
          {/* Left Side - Text */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h3 className="text-2xl md:text-3xl font-bold mb-6 text-gray-900">
              How GuardianLink Transforms Child Safety
            </h3>
            <ul className="space-y-4">
              {SOLUTION_FEATURES.map((feature, index) => (
                <motion.li
                  key={index}
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="flex-shrink-0 mt-1">
                    <CheckCircle2 className="w-5 h-5 text-secondary" />
                  </div>
                  <span className="text-gray-700">{feature}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Right Side - Illustration */}
          <motion.div
            className="relative h-96 md:h-full"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-primary/5 rounded-2xl blur-3xl"></div>
            <div className="relative h-full flex items-center justify-center">
              <div className="w-full max-w-sm">
                <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl p-8 border border-primary/20 backdrop-blur-sm">
                  <div className="space-y-6">
                    {[
                      { number: "1", title: "Register Child", time: "2 min" },
                      { number: "2", title: "AI Enrollment", time: "Instant" },
                      { number: "3", title: "Citizen Reports", time: "Real-time" },
                      { number: "4", title: "Safe Reunion", time: "Minutes" },
                    ].map((step, index) => (
                      <motion.div
                        key={index}
                        className="flex items-center gap-4"
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{step.number}</span>
                        </div>
                        <div className="flex-grow">
                          <p className="font-semibold text-gray-900">{step.title}</p>
                          <p className="text-xs text-gray-600">{step.time}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Solutions Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {SOLUTIONS_DATA.map((solution, index) => {
            const Icon = solution.icon;
            const colors = colorStyles[solution.color];
            return (
              <motion.div
                key={index}
                variants={cardVariants}
                className="group"
              >
                <div className={`h-full p-6 md:p-8 rounded-2xl border ${colors.border} ${colors.bg} hover:shadow-lg transition-all duration-300 hover:border-gray-300`}>
                  <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className={`w-6 h-6 ${colors.icon}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {solution.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {solution.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};
