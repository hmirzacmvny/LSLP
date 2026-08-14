import { motion } from 'framer-motion'

const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04 },
  },
}

const item = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 380, damping: 30 },
  },
}

export function PageReveal({ children, className }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function RevealItem({ children, className }) {
  return (
    <motion.div variants={item} className={className}>
      {children}
    </motion.div>
  )
}
