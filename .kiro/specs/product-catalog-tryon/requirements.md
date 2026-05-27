# Requirements Document

## Introduction

This feature adds a Product Catalog with integrated Virtual Try-On to the existing JewelTry Next.js application. A new `/products` section provides an e-commerce-style browsing experience where customers can view jewelry products stored in MongoDB (with images hosted on AWS S3) and launch a try-on experience directly from any product card or detail page. The feature is entirely additive — no existing pages, components, or API routes are modified.

## Glossary

- **Catalog**: The `/products` page that displays all available jewelry products in a grid layout.
- **Product**: A MongoDB document representing a single jewelry item with metadata (name, price, category, description) and an image stored in S3.
- **Product_Card**: A UI card component rendered in the Catalog grid showing a product's image, name, price, category badge, and a "Try On" button.
- **Product_Detail_Page**: The `/products/[id]` page showing full product information and the try-on interface.
- **TryOn_Modal**: A full-screen overlay launched from a Product_Card or Product_Detail_Page that hosts the try-on workflow.
- **Enhanced_Result_Display**: A new result component (separate from the existing `ResultDisplay`) that shows try-on output with Compare, Result, and Split view tabs.
- **Products_API**: The `/api/products` route handling CRUD operations for Product documents.
- **Upload_API**: The `/api/products/upload` route handling image uploads to AWS S3.
- **Admin_Panel**: A simple `/products/admin` page for adding and managing products.
- **S3_Uploader**: The server-side utility that uploads product images to the `techiebucks-internal` S3 bucket in the `ap-south-1` region.
- **MongoDB_Client**: The server-side utility that connects to the `jewelry-catalog` database on the provided MongoDB Atlas cluster.
- **JewelryCategory**: The existing union type (`necklace | earrings | ring | bracelet | anklet | brooch | tiara | pendant`) defined in `src/types/index.ts`.

---

## Requirements

### Requirement 1: Product Data Model and MongoDB Persistence

**User Story:** As a store owner, I want products to be stored in MongoDB so that the catalog is dynamic and manageable without code changes.

#### Acceptance Criteria

1. THE MongoDB_Client SHALL connect to the `jewelry-catalog` database on the cluster at `mongodb+srv://youcam:B5wmGFteDPwJlCfa@cluster0.qjgpe8t.mongodb.net/`.
2. THE MongoDB_Client SHALL reuse an existing connection when one is already established (connection pooling), rather than opening a new connection on every request.
3. THE Products_API SHALL store each Product with the following fields: `_id` (ObjectId), `name` (string, required), `description` (string), `price` (number, required, ≥ 0), `category` (JewelryCategory, required), `imageUrl` (string, required — S3 URL), `thumbnailUrl` (string — optional smaller S3 URL), `inStock` (boolean, default `true`), `createdAt` (Date), `updatedAt` (Date).
4. IF a required field (`name`, `price`, `category`, `imageUrl`) is missing from a create request, THEN THE Products_API SHALL return HTTP 400 with a descriptive validation error message for the first missing field encountered.
5. IF a `price` value less than 0 is provided, THEN THE Products_API SHALL return HTTP 400 with the message "Price must be a non-negative number".
6. IF a `category` value not in the JewelryCategory union is provided, THEN THE Products_API SHALL return HTTP 400 with the message "Invalid jewelry category".

---

### Requirement 2: Products CRUD API

**User Story:** As a store owner, I want a REST API for products so that I can create, read, update, and delete catalog items programmatically.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/products`, THE Products_API SHALL return a JSON array of all products sorted by `createdAt` descending.
2. WHEN a GET request includes a `category` query parameter, THE Products_API SHALL return only products whose `category` matches the provided value.
3. WHEN a GET request includes an `inStock=true` query parameter, THE Products_API SHALL return only products where `inStock` is `true`.
4. WHEN a GET request is made to `/api/products/[id]` with a valid ObjectId, THE Products_API SHALL return the matching product as a JSON object.
5. IF a GET request is made to `/api/products/[id]` with an id that does not match any product, THEN THE Products_API SHALL return HTTP 404 with the message "Product not found".
6. WHEN a POST request with a valid product body is made to `/api/products`, THE Products_API SHALL create the product in MongoDB and return HTTP 201 with the created product document.
7. WHEN a PATCH request with updated fields is made to `/api/products/[id]`, THE Products_API SHALL update the matching product, set `updatedAt` to the current timestamp, and return the updated document.
8. IF a PATCH request is made to `/api/products/[id]` with an invalid ObjectId format, THEN THE Products_API SHALL return HTTP 400 with the message "Invalid product ID".
9. WHEN a DELETE request is made to `/api/products/[id]`, THE Products_API SHALL attempt to remove the matching product from MongoDB and return HTTP 200 with `{ success: true }` regardless of whether a matching product was found.
10. IF an unhandled server error occurs in any Products_API handler, THEN THE Products_API SHALL return HTTP 500 with `{ success: false, error: "<message>" }`.

---

### Requirement 3: Product Image Upload to S3

**User Story:** As a store owner, I want product images uploaded to S3 so that images are reliably hosted and served via CDN URLs.

#### Acceptance Criteria

1. WHEN a POST request with a valid image file is made to `/api/products/upload`, THE Upload_API SHALL upload the file to the `techiebucks-internal` S3 bucket under the `products/` key prefix using the credentials in `.env.local`.
2. THE Upload_API SHALL generate a unique S3 key for each upload using a UUID combined with the original filename to prevent collisions.
3. WHEN the upload succeeds, THE Upload_API SHALL return HTTP 200 with `{ url: "<public S3 URL>" }`.
4. IF the uploaded file's MIME type is not `image/jpeg`, `image/png`, or `image/webp`, THEN THE Upload_API SHALL return HTTP 400 with the message "Only JPEG, PNG, and WebP images are allowed".
5. IF the uploaded file exceeds 10 MB, THEN THE Upload_API SHALL return HTTP 400 with the message "Image must be 10 MB or smaller".
6. IF the S3 upload fails, THEN THE Upload_API SHALL return HTTP 500 with `{ success: false, error: "Image upload failed" }`.

---

### Requirement 4: Product Catalog Page

**User Story:** As a shopper, I want to browse all available jewelry products in a grid so that I can discover items and choose what to try on.

#### Acceptance Criteria

1. THE Catalog SHALL be accessible at the `/products` route without modifying `src/app/page.tsx` or any existing component.
2. THE Catalog SHALL display products in a responsive grid: 1 column on mobile (< 640 px), 2 columns on tablet (640–1023 px), and 3 columns on desktop (≥ 1024 px).
3. WHEN the Catalog page loads, THE Catalog SHALL fetch products from `/api/products` and display a loading skeleton while the request is in flight.
4. IF the `/api/products` request fails, THE Catalog SHALL display an error message with a "Retry" button and SHALL NOT display the empty-state message.
5. IF the `/api/products` request succeeds and returns zero products, THE Catalog SHALL display an empty-state message: "No products available yet."
6. THE Catalog SHALL display a category filter bar above the grid allowing the user to filter by JewelryCategory or view "All".
7. WHEN a category filter is selected, THE Catalog SHALL update the displayed products to show only items matching that category without a full page reload.
8. THE Catalog SHALL use the existing gold/jewelry Tailwind theme (colors, fonts, border styles) consistent with the rest of the application.

---

### Requirement 5: Product Card

**User Story:** As a shopper, I want each product card to show key details and a "Try On" button so that I can quickly assess and try items.

#### Acceptance Criteria

1. THE Product_Card SHALL display the product image, name, price (formatted as currency), category badge, and a "Try On" button.
2. WHEN a product image fails to load, THE Product_Card SHALL display a placeholder jewelry icon in place of the broken image.
3. WHEN the "Try On" button is clicked, THE Product_Card SHALL open the TryOn_Modal pre-loaded with the product's image and category.
4. WHEN the product name is clicked, THE Product_Card SHALL navigate to `/products/[id]`.
5. THE Product_Card SHALL display an "Out of Stock" badge and disable the "Try On" button when `inStock` is `false`. WHEN the disabled "Try On" button is clicked, THE Product_Card SHALL still open the TryOn_Modal.

---

### Requirement 6: Product Detail Page

**User Story:** As a shopper, I want a dedicated product page so that I can see full details and launch the try-on from there.

#### Acceptance Criteria

1. THE Product_Detail_Page SHALL be accessible at `/products/[id]` and display the product's full image, name, price, category, description, and stock status.
2. WHEN the Product_Detail_Page loads with a valid product id, THE Product_Detail_Page SHALL fetch the product from `/api/products/[id]` and render its details.
3. IF the product id is malformed or does not match any product, THE Product_Detail_Page SHALL render a "Product not found" message with a link back to `/products`. THE Product_Detail_Page SHALL render the "Product not found" message even if the back link fails to render.
4. THE Product_Detail_Page SHALL include a prominent "Try On" button that opens the TryOn_Modal pre-loaded with the product's image and category.
5. THE Product_Detail_Page SHALL include a breadcrumb navigation: "Home → Products → [Product Name]".

---

### Requirement 7: Try-On Modal

**User Story:** As a shopper, I want to try on a product without leaving the catalog so that the shopping flow is uninterrupted.

#### Acceptance Criteria

1. THE TryOn_Modal SHALL render as a full-screen overlay with a close button (×) in the top-right corner.
2. WHEN the TryOn_Modal opens, THE TryOn_Modal SHALL pre-populate the jewelry image slot with the selected product's image and set the jewelry category to the product's category.
3. THE TryOn_Modal SHALL allow the user to upload their own photo via the existing ImageDropzone interaction pattern.
4. WHEN the user submits the try-on form inside the TryOn_Modal, THE TryOn_Modal SHALL call `/api/tryon` with the user photo and the product image.
5. WHEN the try-on result is ready, THE TryOn_Modal SHALL display the Enhanced_Result_Display component alongside the upload form.
6. WHEN the close button is clicked, THE TryOn_Modal SHALL close and return focus to the underlying catalog or detail page.
7. WHEN the Escape key is pressed while the TryOn_Modal is open, THE TryOn_Modal SHALL close.
8. WHILE the TryOn_Modal is open, THE TryOn_Modal SHALL prevent scrolling of the background page.

---

### Requirement 8: Enhanced Result Display

**User Story:** As a shopper, I want to compare my original photo with the try-on result in multiple views so that I can make a confident purchase decision.

#### Acceptance Criteria

1. THE Enhanced_Result_Display SHALL be a new component at `src/components/catalog/EnhancedResultDisplay.tsx` and SHALL NOT modify the existing `src/components/ResultDisplay.tsx`.
2. THE Enhanced_Result_Display SHALL always render three view tabs: "Result", "Compare", and "Split". WHEN the user's original photo is unavailable, THE Enhanced_Result_Display SHALL disable the "Compare" and "Split" tabs rather than hiding them.
3. WHEN the "Compare" tab is active, THE Enhanced_Result_Display SHALL render a draggable comparison slider using the existing `react-compare-slider` library.
4. WHEN the "Split" tab is active, THE Enhanced_Result_Display SHALL display the original photo and the result photo side by side with "Before" and "After" labels.
5. THE Enhanced_Result_Display SHALL provide a "Download" button that saves the result image to the user's device.
6. THE Enhanced_Result_Display SHALL provide a "Try Another" button that resets the modal to the upload state while keeping the product image pre-loaded.
7. WHEN the user's original photo becomes unavailable while the "Compare" or "Split" tab is active, THE Enhanced_Result_Display SHALL immediately switch to the "Result" tab and disable the "Compare" and "Split" tabs.

---

### Requirement 9: Admin Panel for Product Management

**User Story:** As a store owner, I want a simple admin interface so that I can add, edit, and remove products without writing code.

#### Acceptance Criteria

1. THE Admin_Panel SHALL be accessible at `/products/admin` as a client-side page.
2. THE Admin_Panel SHALL display a list of all existing products with their name, category, price, and stock status.
3. THE Admin_Panel SHALL provide an "Add Product" form with fields for name, description, price, category (dropdown of JewelryCategory values), and image upload.
4. WHEN an image is selected in the "Add Product" form, THE Admin_Panel SHALL upload it to S3 via `/api/products/upload` and display a preview before the product is saved.
5. WHEN the "Add Product" form is submitted with valid data, THE Admin_Panel SHALL POST to `/api/products` and add the new product to the list on success.
6. THE Admin_Panel SHALL provide a "Delete" button per product that calls DELETE `/api/products/[id]` and removes the product from the displayed list on success.
7. THE Admin_Panel SHALL provide a toggle to flip the `inStock` status of a product via PATCH `/api/products/[id]`.
8. IF any Admin_Panel API call fails, THE Admin_Panel SHALL display an inline error message describing the failure.

---

### Requirement 10: Navigation Integration

**User Story:** As a shopper, I want to reach the product catalog from the main navigation so that I can discover it easily.

#### Acceptance Criteria

1. THE Catalog SHALL be reachable via a "Products" link added to the existing `Header` component without altering the Header's existing props or behavior on the home page.
2. WHEN the user is on the `/products` route, THE Header SHALL highlight the "Products" navigation link as active. WHILE the user is on any non-products page, THE Header SHALL keep the "Products" link unhighlighted.
3. THE Header modification SHALL be backward-compatible: the home page (`/`) SHALL continue to render identically to its current state, provided the Header component's existing props remain unchanged.
