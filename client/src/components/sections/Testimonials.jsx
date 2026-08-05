import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { TESTIMONIALS_DATA } from "@/constants/landingData";

export const Testimonials = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
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
    <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-12 md:mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-full mb-4">
            <Star className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-semibold text-yellow-600">Testimonials</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Stories of Hope and Reunion
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Real voices from parents, officers, and community leaders who have experienced GuardianLink's impact.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {TESTIMONIALS_DATA.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              className="group"
            >
              <div className="h-full p-8 rounded-2xl border border-gray-200 bg-white hover:shadow-xl hover:border-primary/30 transition-all duration-300 flex flex-col">
                {/* Quote Icon */}
                <motion.div
                  className="mb-4"
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Quote className="w-6 h-6 text-primary/30" />
                </motion.div>

                {/* Content */}
                <p className="text-gray-700 leading-relaxed mb-6 flex-grow">
                  "{testimonial.content}"
                </p>

                {/* Stars */}
                <motion.div
                  className="flex gap-1 mb-6"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                  viewport={{ once: true }}
                >
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </motion.div>

                {/* Author */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{testimonial.image}</div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {testimonial.author}
                      </p>
                      <p className="text-sm text-gray-600">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                </div>
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
            Join thousands of families and organizations protecting children
          </p>
          <motion.button
            className="px-8 py-4 bg-gradient-to-r from-primary to-blue-700 text-white font-semibold rounded-lg hover:shadow-xl transition-shadow"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Start Your Journey
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};
