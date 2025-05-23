<?php
session_start();
require_once '../../db.php';
require_once 'upload_images.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case 'get_facilities':
        getFacilities();
        break;

    case 'update_availability':
        updateAvailability();
        break;

    case 'get_sports':
        getSports();
        break;

    case 'add_facility':
        addFacility();
        break;

    default:
        echo json_encode(["success" => false, "message" => "⛔ Invalid action"]);
        break;
}

function getFacilities() {
    global $conn;

    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Not logged in']);
        return;
    }

    $username = $_SESSION['user_id'];
    $stmt = $conn->prepare("SELECT * FROM sportfacilities WHERE owner_username = ? AND is_Accepted = 1");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();

    $facilities = [];
    while ($row = $result->fetch_assoc()) {
        $facilities[] = $row;
    }

    echo json_encode($facilities);
}

function updateAvailability() {
    global $conn;

    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Not logged in']);
        return;
    }

    $username = $_SESSION['user_id'];
    $facility_id = $_POST['facility_id'] ?? null;
    $is_available = $_POST['is_available'] ?? null;

    $check_stmt = $conn->prepare("SELECT * FROM sportfacilities WHERE facilities_id = ? AND owner_username = ?");
    $check_stmt->bind_param("is", $facility_id, $username);
    $check_stmt->execute();
    $result = $check_stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized access']);
        return;
    }

    $stmt = $conn->prepare("UPDATE sportfacilities SET is_available = ? WHERE facilities_id = ? AND owner_username = ?");
    $stmt->bind_param("iis", $is_available, $facility_id, $username);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Availability updated"]);
    } else {
        echo json_encode(["success" => false, "message" => "Failed to update"]);
    }
}

function getSports() {
    global $conn;
    $sports = [];
    $result = $conn->query("SELECT sport_id, sport_name FROM sports ORDER BY sport_name ASC");

    while ($row = $result->fetch_assoc()) {
        $sports[] = $row;
    }

    echo json_encode($sports);
}

function addFacility() {
    global $conn;

    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'User not logged in']);
        return;
    }

    $username = $_SESSION['user_id'];
    $place_name = $_POST['place_name'] ?? '';
    $sport_type = $_POST['sport_type'] ?? '';
    $description = $_POST['description'] ?? '';
    $price = intval($_POST['price'] ?? 0);
    $location = $_POST['location'] ?? '';
    $is_available = isset($_POST['is_available']) ? 1 : 0;
    $image_urls = [];

    if (isset($_FILES['venueImages']) && $_FILES['venueImages']['error'][0] !== UPLOAD_ERR_NO_FILE) {
        $image_urls = upload_images($_FILES['venueImages']);
    }

    $image_url_string = implode(',', $image_urls);
    $conn->begin_transaction();

    try {
        $stmt = $conn->prepare("INSERT INTO sportfacilities (place_name, location, description, image_url, owner_username, SportCategory, price, is_Accepted, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)");
        $stmt->bind_param("ssssssii", $place_name, $location, $description, $image_url_string, $username, $sport_type, $price, $is_available);

        if (!$stmt->execute()) {
            throw new Exception("Failed to add facility: " . $conn->error);
        }

        $facility_id = $conn->insert_id;
        $report_stmt = $conn->prepare("INSERT INTO reports (username, type, suggested_place_name, facilities_id, message, created_at) VALUES (?, 'suggest_place', ?, ?, ?, NOW())");
        $report_msg = "Sport type: $sport_type\nLocation: $location\nPrice: $price\nDescription: $description\nImages: $image_url_string";
        $report_stmt->bind_param("ssis", $username, $place_name, $facility_id, $report_msg);

        if (!$report_stmt->execute()) {
            throw new Exception("Failed to insert report: " . $conn->error);
        }

        $conn->commit();
        echo json_encode(["success" => true, "message" => "Facility added", "facility_id" => $facility_id]);

    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(["success" => false, "message" => $e->getMessage()]);
    }
}
?>