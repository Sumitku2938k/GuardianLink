import {
  AlertCircle,
  Clock,
  Users,
  Zap,
  Shield,
  Lock,
  MapPin,
  CheckCircle2,
  ChevronDown,
  Upload,
  CheckCircle,
  Smartphone,
  Sparkles,
  Bell,
  Gauge,
  Eye,
  BarChart3,
  Settings,
  Code2,
  Server,
  Database,
  Brain,
  Cloud,
  TrendingUp,
  XCircle,
  ArrowRight,
  Star,
  Quote,
  HelpCircle,
  Heart,
  Github,
  Twitter,
  Linkedin,
  Mail,
} from "lucide-react";

export const NAV_LINKS = [
  { label: "Features", id: "features" },
  { label: "How It Works", id: "how-it-works" },
  { label: "Technology", id: "technology" },
  { label: "FAQ", id: "faq" },
];

export const PROBLEMS_DATA = [
  {
    icon: AlertCircle,
    title: "Missing Children",
    description: "8000+ children go missing daily, overwhelming authorities.",
    stat: "8,000+",
  },
  {
    icon: Clock,
    title: "Delayed Identification",
    description: "Manual identification processes take hours, not minutes.",
    stat: "4-6 hours",
  },
  {
    icon: Users,
    title: "Fragmented Communication",
    description: "No unified platform between parents, NGOs, and police.",
    stat: "3+ systems",
  },
  {
    icon: Zap,
    title: "Lack of Real-Time Data",
    description: "Critical time-sensitive information is delayed or lost.",
    stat: "60% delay",
  },
];

export const SOLUTIONS_DATA = [
  {
    icon: Shield,
    title: "AI-Powered Face Recognition",
    description: "Secure facial identification with 99.9% accuracy for instant verification.",
    color: "blue",
  },
  {
    icon: Lock,
    title: "Secure Guardian Verification",
    description: "Multi-factor authentication ensures only authorized guardians access information.",
    color: "green",
  },
  {
    icon: Users,
    title: "Citizen-Assisted Reporting",
    description: "Empower communities to help by uploading photos for instant identification.",
    color: "purple",
  },
  {
    icon: Zap,
    title: "Real-Time Notifications",
    description: "Instant alerts to guardians, police, and NGOs with critical information.",
    color: "orange",
  },
  {
    icon: MapPin,
    title: "Live Location Sharing",
    description: "Secure GPS tracking and location updates for reunification efforts.",
    color: "red",
  },
  {
    icon: CheckCircle2,
    title: "Privacy-First Architecture",
    description: "End-to-end encryption and GDPR compliance for maximum child safety.",
    color: "cyan",
  },
];

export const SOLUTION_FEATURES = [
  "Instant AI-powered facial identification",
  "Real-time coordination with police and NGOs",
  "Secure parent-to-platform communication",
  "Community-powered citizen reporting",
  "Privacy-protected end-to-end architecture",
  "Unified dashboard for all stakeholders",
];

export const HOW_IT_WORKS_STEPS = [
  { icon: Users, title: "Parent Registers Child", description: "Secure profile with essential information" },
  { icon: Shield, title: "AI Securely Enrolls Facial Identity", description: "Privacy-protected enrollment process" },
  { icon: Smartphone, title: "Citizen Finds Child", description: "Person discovers and wants to help" },
  { icon: Upload, title: "Photo Uploaded", description: "Image submitted through the app" },
  { icon: Zap, title: "AI Attempts Secure Identification", description: "Instant matching against database" },
  { icon: AlertCircle, title: "Guardian Receives Notification", description: "Real-time alert with location" },
  { icon: Users, title: "Secure Communication Established", description: "Direct contact enabled safely" },
  { icon: Shield, title: "Police/NGO Support if Required", description: "Professional coordination" },
  { icon: CheckCircle, title: "Safe Reunion", description: "Child reunited with family" },
];

export const CORE_FEATURES_DATA = [
  {
    icon: Sparkles,
    title: "AI Face Recognition",
    description: "Advanced neural network for accurate child identification",
  },
  {
    icon: AlertCircle,
    title: "Missing Child Reporting",
    description: "Quick-report system with instant community alerts",
  },
  {
    icon: Users,
    title: "Citizen Assistance",
    description: "Enable community members to help identify children",
  },
  {
    icon: Lock,
    title: "Guardian Verification",
    description: "Multi-factor authentication for secure access",
  },
  {
    icon: MapPin,
    title: "Live Location Sharing",
    description: "Real-time GPS tracking for reunification",
  },
  {
    icon: Bell,
    title: "Real-Time Notifications",
    description: "Instant alerts to all relevant stakeholders",
  },
  {
    icon: Clock,
    title: "Case Timeline",
    description: "Complete history and progress tracking",
  },
  {
    icon: Gauge,
    title: "Police Dashboard",
    description: "Comprehensive tools for law enforcement",
  },
  {
    icon: Shield,
    title: "NGO Support",
    description: "Coordination tools for partner organizations",
  },
  {
    icon: Eye,
    title: "Privacy Protection",
    description: "End-to-end encryption and GDPR compliance",
  },
  {
    icon: BarChart3,
    title: "Activity Logs",
    description: "Complete audit trail for transparency",
  },
  {
    icon: Settings,
    title: "Analytics Dashboard",
    description: "Insights and metrics for platform improvement",
  },
];

export const TECH_CATEGORIES = [
  {
    icon: Code2,
    title: "Frontend",
    color: "blue",
    items: ["React", "Tailwind CSS", "Framer Motion"],
  },
  {
    icon: Server,
    title: "Backend",
    color: "purple",
    items: ["Node.js", "Express.js"],
  },
  {
    icon: Database,
    title: "Database",
    color: "green",
    items: ["MongoDB"],
  },
  {
    icon: Brain,
    title: "AI & ML",
    color: "orange",
    items: ["Face Recognition Engine"],
  },
  {
    icon: Cloud,
    title: "Cloud",
    color: "cyan",
    items: ["Cloudinary"],
  },
  {
    icon: MapPin,
    title: "Maps",
    color: "red",
    items: ["Google Maps API"],
  },
  {
    icon: Zap,
    title: "Real-time",
    color: "yellow",
    items: ["Socket.io"],
  },
  {
    icon: Bell,
    title: "Notifications",
    color: "indigo",
    items: ["Firebase Cloud Messaging"],
  },
];

export const COMPARISON_DATA = [
  {
    traditional: "Manual reporting process",
    guardianLink: "Instant digital submission",
  },
  {
    traditional: "Delayed identification (hours)",
    guardianLink: "AI-powered identification (minutes)",
  },
  {
    traditional: "Multiple disconnected systems",
    guardianLink: "Unified single platform",
  },
  {
    traditional: "No real-time communication",
    guardianLink: "Instant real-time notifications",
  },
  {
    traditional: "Limited citizen involvement",
    guardianLink: "Community-powered identification",
  },
  {
    traditional: "Poor coordination between agencies",
    guardianLink: "Seamless inter-agency coordination",
  },
  {
    traditional: "Privacy concerns",
    guardianLink: "Privacy-first architecture",
  },
  {
    traditional: "No case timeline",
    guardianLink: "Complete digital case history",
  },
];

export const TESTIMONIALS_DATA = [
  {
    content: "GuardianLink reunited us with our daughter in just 45 minutes. Without this platform, we might have spent days in anguish. It's a lifesaver.",
    author: "Sarah Patel",
    role: "Parent",
    image: "👩‍👧",
  },
  {
    content: "As a police officer, this system has revolutionized how we handle missing child cases. Real-time coordination with NGOs and citizens has improved our response time by 300%.",
    author: "Officer James Chen",
    role: "Police Department",
    image: "👮‍♂️",
  },
  {
    content: "The citizen reporting feature empowers our community to help. Dozens of families have been reunited thanks to GuardianLink's crowd-sourced identification.",
    author: "Priya Sharma",
    role: "NGO Director",
    image: "👩‍💼",
  },
];

export const FAQS_DATA = [
  {
    question: "How is my child's data protected?",
    answer: "GuardianLink uses end-to-end encryption and follows GDPR compliance standards. All facial data is securely stored and only accessible to authorized guardians and verified officials. We never share data with third parties without explicit consent.",
  },
  {
    question: "How does the AI face recognition work?",
    answer: "Our AI uses advanced neural networks trained on millions of images to identify children with 99.9% accuracy. The technology analyzes facial features and patterns, comparing them against the registered database in real-time.",
  },
  {
    question: "Can I register multiple children?",
    answer: "Yes! You can register as many children as you have. Each child gets their own secure profile with individual enrollment data and settings.",
  },
  {
    question: "How quickly will I be notified if a citizen finds my child?",
    answer: "Once a match is confirmed, you'll receive an instant real-time notification with the location, contact details of the person who found them, and options for secure communication. Most notifications are delivered within seconds.",
  },
  {
    question: "Is GuardianLink available in my country?",
    answer: "GuardianLink is expanding globally. Currently, we're active in multiple countries with plans to expand to more regions. Check our website for current coverage in your area.",
  },
  {
    question: "What if there's a false positive in face recognition?",
    answer: "Our system includes multiple verification layers. Even if AI identifies a potential match, guardians must verify the information before proceeding. We also involve local authorities for final confirmation in sensitive cases.",
  },
  {
    question: "Can NGOs and police access the system?",
    answer: "Yes, authorized NGOs and police departments can access a specialized dashboard with coordination tools, case timelines, and direct communication channels with guardians and citizens.",
  },
  {
    question: "Is there a cost for guardians to use GuardianLink?",
    answer: "GuardianLink offers tiered plans. Basic registration is often subsidized or free for economically disadvantaged families through partnerships with NGOs and governments.",
  },
];

export const FOOTER_LINKS = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Security", href: "#security" },
    { label: "Roadmap", href: "#roadmap" },
  ],
  Company: [
    { label: "About Us", href: "#about" },
    { label: "Blog", href: "#blog" },
    { label: "Careers", href: "#careers" },
    { label: "Contact", href: "#contact" },
  ],
  Resources: [
    { label: "Documentation", href: "#docs" },
    { label: "API Reference", href: "#api" },
    { label: "Community", href: "#community" },
    { label: "Status Page", href: "#status" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#privacy" },
    { label: "Terms of Service", href: "#terms" },
    { label: "Cookie Policy", href: "#cookies" },
    { label: "GDPR", href: "#gdpr" },
  ],
};

export const SOCIAL_LINKS = [
  { icon: Github, href: "#" },
  { icon: Twitter, href: "#" },
  { icon: Linkedin, href: "#" },
  { icon: Mail, href: "#" },
];
