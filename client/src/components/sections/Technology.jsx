import { motion } from "framer-motion";
import { Code2 } from "lucide-react";
import { TECH_CATEGORIES } from "@/constants/landingData";

export const Technology = () => {
  const colorStyles = {
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    green: "from-green-500 to-green-600",
    orange: "from-orange-500 to-orange-600",
    cyan: "from-cyan-500 to-cyan-600",
    red: "from-red-500 to-red-600",
    yellow: "from-yellow-500 to-yellow-600",
    indigo: "from-indigo-500 to-indigo-600",
  };

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

  return (
    <section id="technology" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-12 md:mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full mb-4">
            <Code2 className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-600">Technology Stack</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Built on Modern Technology
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Enterprise-grade tools and frameworks ensuring reliability, scalability, and performance.
          </p>
        </motion.div>

        {/* Technology Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {TECH_CATEGORIES.map((category, index) => {
            const Icon = category.icon;
            const gradientClass = colorStyles[category.color];

            return (
              <motion.div
                key={index}
                variants={cardVariants}
                className="group"
              >
                <div className="h-full p-6 md:p-8 rounded-2xl border border-gray-200 bg-white hover:shadow-xl transition-all duration-300 hover:border-gray-300">
                  {/* Icon */}
                  <div className="mb-6">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${gradientClass} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {category.title}
                  </h3>

                  {/* Items */}
                  <ul className="space-y-2">
                    {category.items.map((item, itemIndex) => (
                      <motion.li
                        key={itemIndex}
                        className="flex items-center gap-2 text-gray-600 text-sm"
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: itemIndex * 0.1 }}
                        viewport={{ once: true }}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${gradientClass}`}></div>
                        {item}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Architecture Highlight */}
        <motion.div
          className="mt-12 md:mt-16 p-8 md:p-12 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-secondary/5 to-transparent"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            Why This Stack?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: "Reliability",
                description: "Proven technologies used by leading companies worldwide",
              },
              {
                title: "Scalability",
                description: "Infrastructure designed to grow with your needs",
              },
              {
                title: "Performance",
                description: "Lightning-fast response times and real-time capabilities",
              },
              {
                title: "Security",
                description: "Enterprise-grade security and privacy compliance",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                className="flex gap-3"
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="flex-shrink-0">
                  <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-secondary/20 text-secondary">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{item.title}</p>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
