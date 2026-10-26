import cv2
import matplotlib.pyplot as plt

from preprocessing import preprocess_image


image_path = "../face/test.png"

result = preprocess_image(image_path)


plt.figure(figsize=(10, 6))

plt.subplot(2, 3, 1)
plt.imshow(cv2.cvtColor(result["original"], cv2.COLOR_BGR2RGB))
plt.title("Original")
plt.axis("off")

plt.subplot(2, 3, 2)
plt.imshow(result["rgb"])
plt.title("RGB")
plt.axis("off")

plt.subplot(2, 3, 3)
plt.imshow(result["gray"], cmap="gray")
plt.title("Grayscale")
plt.axis("off")

plt.subplot(2, 3, 4)
plt.imshow(result["blurred"], cmap="gray")
plt.title("Gaussian Blur")
plt.axis("off")

plt.subplot(2, 3, 5)
plt.imshow(result["edges"], cmap="gray")
plt.title("Canny Edges")
plt.axis("off")


contour_image = result["resized"].copy()

cv2.drawContours(
    contour_image,
    result["contours"],
    -1,
    (0, 255, 0),
    2
)

plt.subplot(2, 3, 6)
plt.imshow(cv2.cvtColor(contour_image, cv2.COLOR_BGR2RGB))
plt.title("Contours")
plt.axis("off")

plt.tight_layout()
plt.show()