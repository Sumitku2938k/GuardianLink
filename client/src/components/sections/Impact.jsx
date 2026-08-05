import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { TrendingUp } from "lucide-react";

export const Impact = () => {
  const [counts, setCounts] = useState({
    children: 0,
    reunions: 0,
    citizens: 0,
    ngos: 0,
    police: 0,
    time: 0,
  });

  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const stats = [
    { label: "Children Registered", value: "50,000+", key: "children", target: 50000 },
    { label: "Successful Reunions", value: "12,500+", key: "reunions", target: 12500 },
    { label: "Citizen Reports", value: "150,000+", key: "citizens", target: 150000 },
    { label: "Partner NGOs", value: "500+", key: "ngos", target: 500 },
    { label: "Police Stations", value: "2,000+", key: "police", target: 2000 },
    { label: "Avg. Response Time", value: "4 minutes", static: true },
  ];

  useEffect(() => {
    if (!isInView) return;

    const targets = { children: 50000, reunions: 12500, citizens: 150000, ngos: 500, police: 2000, time: 4 };
    const duration = 2000;
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      setCounts({
        children: Math.floor(targets.children * progress),
        reunions: Math.floor(targets.reunions * progress),
        citizens: Math.floor(targets.citizens * progress),
        ngos: Math.floor(targets.ngos * progress),
        police: Math.floor(targets.police * progress),
        time: Math.floor(targets.time * progress),
      });

      if (progress === 1) clearInterval(interval);
    }, 50);

    return () => clearInterval(interval);
  }, [isInView]);

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
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.6, ease: "easeInOut" },
    },
  };

  return (
    <section ref={ref} className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-12 md:mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full mb-4">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-green-600">Impact</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Real Impact, Real Lives Changed
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            GuardianLink's measurable impact on child safety and family reunification.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              className="group relative p-8 md:p-10 rounded-3xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/50 hover:shadow-xl hover:border-primary/30 transition-all duration-300 overflow-hidden"
            >
              {/* Background Gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              {/* Content */}
              <div className="relative z-10">
                <motion.div
                  className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary mb-3"
                  initial={{ opacity: 0 }}
                  animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  {stat.static ? (
                    stat.value
                  ) : (
                    <>
                      {counts[stat.key]?.toLocaleString()}
                      {stat.label.includes("Reunions") ? "+" : stat.label.includes("Response") ? "" : "+"}
                    </>
                  )}
                </motion.div>

                <p className="text-gray-600 font-medium">
                  {stat.label}
                </p>

                {/* Decorative Line */}
                <motion.div
                  className="mt-4 h-1 w-0 bg-gradient-to-r from-primary to-secondary group-hover:w-full transition-all duration-300"
                  initial={false}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Testimonial/Achievement Section */}
        <motion.div
          className="mt-16 md:mt-24 p-8 md:p-12 rounded-3xl border border-secondary/30 bg-gradient-to-br from-secondary/10 via-blue-50/5 to-transparent"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <div className="max-w-3xl">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Our Commitment to Safety
            </h3>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              Every statistic represents a child reunited with their family, a parent's relief, and a community working together. GuardianLink's mission is to make these numbers grow, ensuring no child is ever lost for long.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <motion.button
                className="px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:shadow-lg transition-shadow"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Join Our Mission
              </motion.button>
              <motion.button
                className="px-6 py-3 border border-primary text-primary font-semibold rounded-lg hover:bg-primary/5 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Learn More
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
