import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { HOW_IT_WORKS_STEPS } from "@/constants/landingData";

export const HowItWorks = () => {
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
    <section id="how-it-works" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50">
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
            <ChevronDown className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-600">The Process</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            From Registration to Reunion
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A seamless 9-step process designed for speed and safety at every stage.
          </p>
        </motion.div>

        {/* Timeline */}
        <motion.div
          className="relative"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* Desktop Timeline Line */}
          <div className="hidden lg:block absolute top-20 left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-primary to-secondary"></div>

          {/* Steps */}
          <div className="space-y-8 md:space-y-12">
            {HOW_IT_WORKS_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isEven = index % 2 === 0;

              return (
                <motion.div
                  key={index}
                  variants={cardVariants}
                  className="relative"
                >
                  {/* Mobile Layout */}
                  <div className="lg:hidden">
                    <div className="flex gap-6">
                      {/* Timeline Connector */}
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 z-10 relative">
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        {index < HOW_IT_WORKS_STEPS.length - 1 && (
                          <div className="w-1 h-12 bg-gradient-to-b from-secondary to-gray-300 mt-2"></div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="pb-8 pt-2">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-bold text-primary">Step {index + 1}</span>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {step.title}
                        </h3>
                        <p className="text-gray-600">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden lg:flex items-center">
                    {isEven ? (
                      <>
                        <div className="w-5/12 text-right pr-8">
                          <div>
                            <span className="text-sm font-bold text-primary">Step {index + 1}</span>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                              {step.title}
                            </h3>
                            <p className="text-gray-600">
                              {step.description}
                            </p>
                          </div>
                        </div>
                        <div className="w-2/12 flex justify-center">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 z-10 relative shadow-lg">
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <div className="w-5/12 pl-8">
                          <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="text-sm text-gray-600 italic">
                              "{step.description.toLowerCase()}"
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-5/12 pr-8">
                          <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="text-sm text-gray-600 italic">
                              "{step.description.toLowerCase()}"
                            </div>
                          </div>
                        </div>
                        <div className="w-2/12 flex justify-center">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 z-10 relative shadow-lg">
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <div className="w-5/12 pl-8">
                          <div>
                            <span className="text-sm font-bold text-primary">Step {index + 1}</span>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                              {step.title}
                            </h3>
                            <p className="text-gray-600">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <p className="text-lg text-gray-600 mb-6">
            Ready to protect your child with GuardianLink?
          </p>
          <motion.button
            className="px-8 py-4 bg-gradient-to-r from-primary to-blue-700 text-white font-semibold rounded-lg hover:shadow-xl transition-shadow inline-flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Start Registration Now
            <ChevronDown className="w-5 h-5 rotate-90" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};
