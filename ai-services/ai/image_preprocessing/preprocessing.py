import cv2


def preprocess_image(image_path):

    image = cv2.imread(image_path)

    if image is None:
        raise ValueError("Could not read image")

    # 1. Resize
    resized = cv2.resize(image, (640, 640))

    # 2. BGR → RGB
    rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)

    # 3. RGB → Grayscale
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)

    # 4. Gaussian Blur
    blurred = cv2.GaussianBlur(
        gray,
        (5, 5),
        0
    )

    # 5. Canny Edge Detection
    edges = cv2.Canny(
        blurred,
        100,
        200
    )

    # 6. Contour Detection
    contours, hierarchy = cv2.findContours(
        edges,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    return {
        "original": image,
        "resized": resized,
        "rgb": rgb,
        "gray": gray,
        "blurred": blurred,
        "edges": edges,
        "contours": contours
    }