import { getCollection } from "astro:content";

export type GalleryInfo = {
	slug: string;
	name: string;
	title: string;
	imageCount: number;
	published: Date;
	description: string;
	image: string;
	tags: string[];
	location: string;
};

export async function getGalleries(): Promise<GalleryInfo[]> {
	// Get gallery entries from content collections
	const galleryEntries = await getCollection("galleries");
	const localImageModules = import.meta.glob(
		"../content/galleries/**/*.{jpg,jpeg,png,webp,avif,gif}",
		{ eager: true },
	) as Record<string, { default: { src: string } }>;

	// Process galleries in parallel for better performance
	const galleryPromises = galleryEntries.map(async (entry) => {
		// Extract slug from id: "gallery1/index" -> "gallery1"
		const slug = entry.id.replace(/\/index$/, "");
		const localImages = Object.entries(localImageModules)
			.filter(([path]) => path.includes(`/content/galleries/${slug}/`))
			.sort(([a], [b]) => a.localeCompare(b));

		const localImageCount = localImages.length;
		const firstLocalImageUrl = localImages[0]?.[1]?.default?.src || "";
		const imageCount = localImageCount;

		// Use cover image from metadata if available, otherwise use first local image
		let finalImagePath = entry.data.image || "";

		if (finalImagePath && !finalImagePath.startsWith("http")) {
			const explicitLocalImage = localImages.find(([path]) =>
				path.endsWith(`/${finalImagePath}`),
			)?.[1]?.default?.src;

			if (explicitLocalImage) {
				finalImagePath = explicitLocalImage;
			} else {
				finalImagePath = firstLocalImageUrl;
			}
		} else if (!finalImagePath) {
			finalImagePath = firstLocalImageUrl;
		}

		return {
			slug,
			name: slug,
			title: entry.data.title,
			imageCount,
			published: entry.data.published,
			description: entry.data.description || "",
			image: finalImagePath,
			tags: entry.data.tags || [],
			location: entry.data.location || "",
		};
	});

	// Wait for all galleries to be processed in parallel
	const results = await Promise.all(galleryPromises);

	// Sort by published date (newest first)
	results.sort((a, b) => b.published.getTime() - a.published.getTime());

	return results;
}

export type GalleryForList = {
	slug: string;
	data: {
		title: string;
		tags: string[];
		published: Date;
		location?: string;
	};
};

export async function getSortedGalleriesList(): Promise<GalleryForList[]> {
	const galleries = await getGalleries();

	return galleries.map((gallery) => ({
		slug: gallery.slug,
		data: {
			title: gallery.title,
			tags: gallery.tags,
			published: gallery.published,
			location: gallery.location || undefined,
		},
	}));
}
