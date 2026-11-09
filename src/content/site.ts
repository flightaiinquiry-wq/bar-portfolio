export type Project = {
  id: "website" | "dating" | "brand" | "game";
  title: string;
  info: string;
  /** Optional real media in /public (jpg, png, mp4, webm). Without it a generated cover is shown. */
  media?: string;
  href?: string;
};

export const site = {
  name: "Bar Bolandi",
  role: "UX/UI Designer",
  description:
    "UX/UI designer and Instructional Technologies student at HIT, focused on user-centered design, interaction design and Figma prototyping.",
  statement:
    "Third-year Instructional Technologies student at HIT, focused on UX/UI design.",
  ringTop: "Hebrew (native)",
  ringBottom: "English (fluent)",
  location: "Based in Holon, Israel",
  approach:
    "Experience in user-centered design, interaction design and Figma prototyping, including accessibility-focused flows and interactive learning experiences.",
  worksKicker: "Selected Projects",
  closing: "Seeking a student UX/UI position to grow in a product-driven team.",
  contactKicker: "Get in touch",
  email: "barbolandi55@gmail.com",
  linkedin: "https://www.linkedin.com/in/barbolandi",
  year: 2026,
  footerNote: "This website doesn’t use cookies.",
  greeting: "hey there!",
  projects: [
    {
      id: "website",
      title: "Final UX/UI website project",
      info: "Faculty Excellence · Figma",
    },
    {
      id: "dating",
      title: "Dating app onboarding – senior users",
      info: "Figma · Course project",
    },
    {
      id: "brand",
      title: "4THECROWD – clothing brand website",
      info: "UX/UI design · Team project",
      media: "/works/4thecrowd.jpg",
      href: "https://4thecrowd.com",
    },
    {
      id: "game",
      title: "Catch the Fish – 3D educational game",
      info: "Unity, C#, Figma · Course project",
    },
  ] satisfies Project[] as Project[],
};
