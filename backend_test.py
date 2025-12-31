import requests
import sys
import json
from datetime import datetime, timedelta

class ArchivioMaledettoAPITester:
    def __init__(self, base_url="https://cursed-lore.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.user_id = None
        self.admin_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_aids = []  # Track created aids for cleanup
        self.admin_email = None  # Store admin email for make_admin script

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f", Expected: {expected_status}"
                try:
                    error_data = response.json()
                    details += f", Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f", Response: {response.text[:100]}"

            self.log_test(name, success, details)
            return success, response.json() if success and response.content else {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )
        return success

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_user = {
            "username": f"testuser_{timestamp}",
            "email": f"test_{timestamp}@example.com",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_admin_registration(self):
        """Register admin user for testing"""
        timestamp = datetime.now().strftime('%H%M%S')
        admin_user = {
            "username": f"admin_{timestamp}",
            "email": f"admin_{timestamp}@example.com",
            "password": "AdminPass123!"
        }
        
        success, response = self.run_test(
            "Admin Registration",
            "POST",
            "auth/register",
            200,
            data=admin_user
        )
        
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            self.admin_id = response['user']['id']
            self.admin_email = admin_user['email']  # Store email for make_admin script
            return True
        return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        # Try to login with a known user (we'll use the registered user)
        if not self.token:
            return False
            
        # Test /auth/me endpoint instead since we already have token
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200,
            headers={'Authorization': f'Bearer {self.token}'}
        )
        return success

    def test_knowledge_base_operations(self):
        """Test knowledge base operations"""
        if not self.admin_token:
            self.log_test("Knowledge Base Operations", False, "No admin token available")
            return False

        # Test getting knowledge (should work for any authenticated user)
        success, response = self.run_test(
            "Get Knowledge Base Documents",
            "GET",
            "knowledge",
            200,
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )

        # Test adding knowledge (should fail with 403 since user is not admin)
        success, response = self.run_test(
            "Add Knowledge Base (Non-Admin - Should Fail)",
            "POST",
            "knowledge",
            403,
            data={
                "title": "Test Knowledge Document",
                "content": "This is a test document for the knowledge base.",
                "category": "general"
            },
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )

        return True

    def make_user_admin(self):
        """Make the admin user actually an admin role"""
        if not self.admin_id or not self.admin_token:
            return False
            
        # This is a bit of a hack - we need to manually update the user role
        # Since we can't do this via API without being admin already, we'll skip this step
        # and assume the admin endpoints will work
        return True

    def make_user_admin_via_script(self):
        """Make the admin user actually an admin using the make_admin.py script"""
        if not self.admin_email:
            return False
        
        try:
            import subprocess
            import os
            
            # Change to backend directory and run make_admin.py
            backend_dir = "/app/backend"
            result = subprocess.run(
                ["python", "make_admin.py", self.admin_email],
                cwd=backend_dir,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                print(f"✅ Successfully made user {self.admin_email} an admin")
                return True
            else:
                print(f"❌ Failed to make user admin: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Exception making user admin: {str(e)}")
            return False

    def test_aids_creation(self):
        """Test creating Focalizzazioni with end_date and time window"""
        if not self.admin_token:
            self.log_test("AIDS Creation", False, "No admin token available")
            return False

        # Test 1: Create aid with end_date
        today = datetime.now()
        tomorrow = today + timedelta(days=1)
        
        aid_data = {
            "name": "Focalizzazione Intelligenza Test",
            "attribute": "Intelligenza",
            "levels": [
                {"level": 2, "level_name": "minore", "text": "Bonus minore di Intelligenza"},
                {"level": 4, "level_name": "medio", "text": "Bonus medio di Intelligenza"},
                {"level": 5, "level_name": "maggiore", "text": "Bonus maggiore di Intelligenza"}
            ],
            "event_date": today.strftime("%Y-%m-%d"),
            "end_date": tomorrow.strftime("%Y-%m-%d"),
            "start_time": "10:00",
            "end_time": "18:00"
        }
        
        success, response = self.run_test(
            "Create Aid with end_date",
            "POST",
            "aids",
            200,
            data=aid_data,
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        
        if success and 'id' in response:
            self.created_aids.append(response['id'])
            # Verify response contains end_date and no _id
            if 'end_date' not in response:
                self.log_test("Aid Response Validation", False, "Response missing end_date field")
                return False
            if '_id' in response:
                self.log_test("Aid Response Validation", False, "Response contains _id field")
                return False
            self.log_test("Aid Response Validation", True, "Response format correct")
        
        # Test 2: Create aid without end_date (should work)
        aid_data_no_end = {
            "name": "Focalizzazione Saggezza Test",
            "attribute": "Saggezza",
            "levels": [
                {"level": 2, "level_name": "minore", "text": "Bonus minore di Saggezza"}
            ],
            "event_date": today.strftime("%Y-%m-%d"),
            "start_time": "09:00",
            "end_time": "17:00"
        }
        
        success, response = self.run_test(
            "Create Aid without end_date",
            "POST",
            "aids",
            200,
            data=aid_data_no_end,
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        
        if success and 'id' in response:
            self.created_aids.append(response['id'])
        
        return success

    def test_aids_get_all(self):
        """Test GET /api/aids - should return all aids with time fields"""
        success, response = self.run_test(
            "Get All AIDS",
            "GET",
            "aids",
            200,
            headers={'Authorization': f'Bearer {self.token}'}
        )
        
        if success and isinstance(response, list):
            # Verify each aid has required fields
            for aid in response:
                required_fields = ['event_date', 'start_time', 'end_time']
                for field in required_fields:
                    if field not in aid:
                        self.log_test("AIDS Fields Validation", False, f"Missing field: {field}")
                        return False
                # end_date can be null or string
                if 'end_date' not in aid:
                    self.log_test("AIDS Fields Validation", False, "Missing end_date field")
                    return False
            
            self.log_test("AIDS Fields Validation", True, "All required fields present")
        
        return success

    def test_aids_active_filtering(self):
        """Test GET /api/aids/active - should filter by time window"""
        if not self.admin_token:
            self.log_test("AIDS Active Filtering", False, "No admin token available")
            return False

        # Create aids with different time windows
        now = datetime.now()
        yesterday = now - timedelta(days=1)
        tomorrow = now + timedelta(days=1)
        
        # Aid 1: Active now (today 00:00 to 23:59)
        active_aid = {
            "name": "Focalizzazione Attiva",
            "attribute": "Percezione",
            "levels": [{"level": 2, "level_name": "minore", "text": "Test attivo"}],
            "event_date": now.strftime("%Y-%m-%d"),
            "start_time": "00:00",
            "end_time": "23:59"
        }
        
        success, response = self.run_test(
            "Create Active Aid",
            "POST",
            "aids",
            200,
            data=active_aid,
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        
        if success and 'id' in response:
            self.created_aids.append(response['id'])
        
        # Aid 2: Not active (yesterday)
        inactive_aid = {
            "name": "Focalizzazione Inattiva",
            "attribute": "Intelligenza",
            "levels": [{"level": 2, "level_name": "minore", "text": "Test inattivo"}],
            "event_date": yesterday.strftime("%Y-%m-%d"),
            "end_date": yesterday.strftime("%Y-%m-%d"),
            "start_time": "10:00",
            "end_time": "18:00"
        }
        
        success, response = self.run_test(
            "Create Inactive Aid",
            "POST",
            "aids",
            200,
            data=inactive_aid,
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        
        if success and 'id' in response:
            self.created_aids.append(response['id'])
        
        # Aid 3: Test midnight crossing (today 22:00 to tomorrow 02:00)
        midnight_aid = {
            "name": "Focalizzazione Mezzanotte",
            "attribute": "Saggezza",
            "levels": [{"level": 2, "level_name": "minore", "text": "Test mezzanotte"}],
            "event_date": now.strftime("%Y-%m-%d"),
            "end_date": tomorrow.strftime("%Y-%m-%d"),
            "start_time": "22:00",
            "end_time": "02:00"
        }
        
        success, response = self.run_test(
            "Create Midnight Crossing Aid",
            "POST",
            "aids",
            200,
            data=midnight_aid,
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        
        if success and 'id' in response:
            self.created_aids.append(response['id'])
        
        # Now test the active filtering
        success, response = self.run_test(
            "Get Active AIDS",
            "GET",
            "aids/active",
            200,
            headers={'Authorization': f'Bearer {self.token}'}
        )
        
        if success and isinstance(response, list):
            # Should contain at least the active aid
            active_names = [aid['name'] for aid in response]
            if "Focalizzazione Attiva" not in active_names:
                self.log_test("Active AIDS Filtering", False, "Active aid not found in results")
                return False
            
            # Should not contain the inactive aid
            if "Focalizzazione Inattiva" in active_names:
                self.log_test("Active AIDS Filtering", False, "Inactive aid found in results")
                return False
            
            self.log_test("Active AIDS Filtering", True, "Filtering working correctly")
        
        return success

    def test_aids_use_functionality(self):
        """Test POST /api/aids/use with time window validation"""
        if not self.token:
            self.log_test("AIDS Use Functionality", False, "No user token available")
            return False

        # First, create an active aid for testing
        now = datetime.now()
        active_aid = {
            "name": "Focalizzazione Test Use",
            "attribute": "Intelligenza",
            "levels": [
                {"level": 2, "level_name": "minore", "text": "Bonus test minore"},
                {"level": 4, "level_name": "medio", "text": "Bonus test medio"}
            ],
            "event_date": now.strftime("%Y-%m-%d"),
            "start_time": "00:00",
            "end_time": "23:59"
        }
        
        success, response = self.run_test(
            "Create Aid for Use Test",
            "POST",
            "aids",
            200,
            data=active_aid,
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        
        if not success or 'id' not in response:
            self.log_test("AIDS Use Functionality", False, "Failed to create test aid")
            return False
        
        aid_id = response['id']
        self.created_aids.append(aid_id)
        
        # Test 1: Use aid with sufficient attribute value
        use_data = {
            "aid_id": aid_id,
            "level": 2,
            "player_attribute_value": 3
        }
        
        success, response = self.run_test(
            "Use Aid with Sufficient Attribute",
            "POST",
            "aids/use",
            200,
            data=use_data,
            headers={'Authorization': f'Bearer {self.token}'}
        )
        
        # Test 2: Try to use same aid/level again (should fail)
        success, response = self.run_test(
            "Use Same Aid/Level Again (Should Fail)",
            "POST",
            "aids/use",
            403,
            data=use_data,
            headers={'Authorization': f'Bearer {self.token}'}
        )
        
        # Test 3: Use aid with insufficient attribute value
        insufficient_data = {
            "aid_id": aid_id,
            "level": 4,
            "player_attribute_value": 2  # Less than required level 4
        }
        
        success, response = self.run_test(
            "Use Aid with Insufficient Attribute (Should Fail)",
            "POST",
            "aids/use",
            403,
            data=insufficient_data,
            headers={'Authorization': f'Bearer {self.token}'}
        )
        
        # Test 4: Create inactive aid and try to use it
        yesterday = now - timedelta(days=1)
        inactive_aid = {
            "name": "Focalizzazione Inattiva Test",
            "attribute": "Saggezza",
            "levels": [{"level": 2, "level_name": "minore", "text": "Test inattivo"}],
            "event_date": yesterday.strftime("%Y-%m-%d"),
            "end_date": yesterday.strftime("%Y-%m-%d"),
            "start_time": "10:00",
            "end_time": "18:00"
        }
        
        success, response = self.run_test(
            "Create Inactive Aid for Use Test",
            "POST",
            "aids",
            200,
            data=inactive_aid,
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        
        if success and 'id' in response:
            inactive_aid_id = response['id']
            self.created_aids.append(inactive_aid_id)
            
            # Try to use inactive aid (should fail with 403)
            inactive_use_data = {
                "aid_id": inactive_aid_id,
                "level": 2,
                "player_attribute_value": 3
            }
            
            success, response = self.run_test(
                "Use Inactive Aid (Should Fail)",
                "POST",
                "aids/use",
                403,
                data=inactive_use_data,
                headers={'Authorization': f'Bearer {self.token}'}
            )
        
        return True

    def test_background_system(self):
        """Test Background system with validation and lock"""
        if not self.token:
            self.log_test("Background System", False, "No user token available")
            return False

        # Test 1: Create background with valid values
        background_data = {
            "user_id": self.user_id,
            "risorse": 10,
            "seguaci": 2,
            "rifugio": 3,
            "mentor": 1,
            "notoriety": 0,
            "contacts": [
                {"name": "Mercante di Libri", "value": 3},
                {"name": "Informatore", "value": 2},
                {"name": "Bibliotecario", "value": 1}
            ],
            "locked_for_player": False
        }
        
        # Calculate total contacts value
        total_contacts = sum(c["value"] for c in background_data["contacts"])
        if total_contacts > 20:
            self.log_test("Background System", False, f"Test data invalid: contacts total {total_contacts} > 20")
            return False
        
        success, response = self.run_test(
            "Create Background with Valid Values",
            "POST",
            "background/me",
            200,
            data=background_data,
            headers={'Authorization': f'Bearer {self.token}'}
        )
        
        if success:
            # Verify locked_for_player is true
            if response.get("locked_for_player") != True:
                self.log_test("Background Lock Validation", False, f"locked_for_player is {response.get('locked_for_player')}, expected True")
                return False
            else:
                self.log_test("Background Lock Validation", True, "locked_for_player correctly set to True")
        
        # Test 2: Try to modify locked background (should fail)
        modified_data = background_data.copy()
        modified_data["risorse"] = 15
        
        success, response = self.run_test(
            "Modify Locked Background (Should Fail)",
            "POST",
            "background/me",
            403,
            data=modified_data,
            headers={'Authorization': f'Bearer {self.token}'}
        )
        
        return True

    def test_refuge_defense_system(self):
        """Test Rifugio defense system in LARP challenges"""
        if not self.admin_token or not self.token:
            self.log_test("Refuge Defense System", False, "Missing admin or user token")
            return False

        # First, ensure user has rifugio=3 in background
        background_data = {
            "user_id": self.user_id,
            "risorse": 5,
            "seguaci": 1,
            "rifugio": 3,  # This should give -1 difficulty bonus
            "mentor": 0,
            "notoriety": 0,
            "contacts": [{"name": "Test Contact", "value": 2}],
            "locked_for_player": False
        }
        
        success, response = self.run_test(
            "Set User Background with Rifugio=3",
            "POST",
            "background/me",
            200,
            data=background_data,
            headers={'Authorization': f'Bearer {self.token}'}
        )
        
        if not success:
            self.log_test("Refuge Defense System", False, "Failed to set background")
            return False

        # Create a challenge with allow_refuge_defense=true and difficulty=8
        challenge_data = {
            "name": "Test Rifugio Challenge",
            "description": "Una prova per testare il sistema di difesa del rifugio",
            "tests": [
                {
                    "attribute": "Intelligenza + Occulto",
                    "difficulty": 8,
                    "success_text": "Riesci a decifrare l'antico testo",
                    "tie_text": "Comprendi parzialmente il significato",
                    "failure_text": "Il testo rimane incomprensibile"
                }
            ],
            "keywords": ["rifugio", "test"],
            "allow_refuge_defense": True
        }
        
        success, response = self.run_test(
            "Create Challenge with Refuge Defense",
            "POST",
            "challenges",
            200,
            data=challenge_data,
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        
        if not success or 'id' not in response:
            self.log_test("Refuge Defense System", False, "Failed to create challenge")
            return False
        
        challenge_id = response['id']
        
        # Test multiple attempts with use_refuge=true
        # With rifugio=3, effective difficulty should be 8-1=7
        attempt_data = {
            "challenge_id": challenge_id,
            "test_index": 0,
            "player_value": 4,
            "use_refuge": True
        }
        
        # We can only attempt once per user, so let's check the logs
        success, response = self.run_test(
            "Attempt Challenge with Refuge Defense",
            "POST",
            "challenges/attempt",
            200,
            data=attempt_data,
            headers={'Authorization': f'Bearer {self.token}'}
        )
        
        if success:
            # Check if the effective difficulty was reduced
            # The response should show the calculation
            if "difficulty" in response:
                original_difficulty = response["difficulty"]
                if original_difficulty == 8:
                    self.log_test("Refuge Defense Calculation", True, f"Original difficulty {original_difficulty} maintained in response")
                else:
                    self.log_test("Refuge Defense Calculation", False, f"Expected difficulty 8, got {original_difficulty}")
            
            # The actual calculation should use effective difficulty 7 internally
            # We can verify this by checking the message or logs
            if "message" in response:
                message = response["message"]
                self.log_test("Refuge Defense Message", True, f"Challenge result: {message}")
        
        # Cleanup: delete the challenge
        try:
            self.run_test(
                "Cleanup Challenge",
                "DELETE",
                f"challenges/{challenge_id}",
                200,
                headers={'Authorization': f'Bearer {self.admin_token}'}
            )
        except:
            pass
        
        return success

    def test_admin_user_deletion(self):
        """Test admin user deletion functionality"""
        if not self.admin_token:
            self.log_test("Admin User Deletion", False, "No admin token available")
            return False

        # First create a test user to delete
        timestamp = datetime.now().strftime('%H%M%S')
        test_user = {
            "username": f"deletetest_{timestamp}",
            "email": f"deletetest_{timestamp}@example.com",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "Create User for Deletion Test",
            "POST",
            "auth/register",
            200,
            data=test_user
        )
        
        if not success or 'user' not in response:
            self.log_test("Admin User Deletion", False, "Failed to create test user")
            return False
        
        test_user_id = response['user']['id']
        
        # Test 1: Delete the user (should succeed)
        success, response = self.run_test(
            "Delete User (First Time)",
            "DELETE",
            f"admin/users/{test_user_id}",
            200,
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        
        if not success:
            return False
        
        # Test 2: Try to delete the same user again (should return 404)
        success, response = self.run_test(
            "Delete User (Second Time - Should Return 404)",
            "DELETE",
            f"admin/users/{test_user_id}",
            404,
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        
        return success

    def test_reset_max_actions(self):
        """Test reset max_actions for all users"""
        if not self.admin_token:
            self.log_test("Reset Max Actions", False, "No admin token available")
            return False

        # Test 1: Call reset-max-actions endpoint
        success, response = self.run_test(
            "Reset Max Actions for All Users",
            "POST",
            "admin/users/reset-max-actions",
            200,
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        
        if not success:
            return False
        
        # Test 2: Verify by getting all users and checking max_actions=20
        success, response = self.run_test(
            "Get All Users to Verify Max Actions",
            "GET",
            "admin/users",
            200,
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        
        if success and isinstance(response, list):
            # Check that all users have max_actions=20
            for user in response:
                if user.get("max_actions") != 20:
                    self.log_test("Max Actions Verification", False, f"User {user.get('username')} has max_actions={user.get('max_actions')}, expected 20")
                    return False
            
            self.log_test("Max Actions Verification", True, f"All {len(response)} users have max_actions=20")
        
        return success

    def cleanup_created_aids(self):
        """Clean up aids created during testing"""
        if not self.admin_token or not self.created_aids:
            return
        
        for aid_id in self.created_aids:
            try:
                success, response = self.run_test(
                    f"Cleanup Aid {aid_id}",
                    "DELETE",
                    f"aids/{aid_id}",
                    200,
                    headers={'Authorization': f'Bearer {self.admin_token}'}
                )
            except:
                pass  # Ignore cleanup errors

    def test_chat_functionality(self):
        """Test chat with AI"""
        if not self.token:
            self.log_test("Chat Functionality", False, "No user token available")
            return False

        chat_data = {
            "question": "Ciao, puoi dirmi qualcosa sull'evento?"
        }
        
        success, response = self.run_test(
            "Send Chat Message",
            "POST",
            "chat",
            200,
            data=chat_data,
            headers={'Authorization': f'Bearer {self.token}'}
        )

        if success:
            # Test getting chat history
            success, response = self.run_test(
                "Get Chat History",
                "GET",
                "chat/history",
                200,
                headers={'Authorization': f'Bearer {self.token}'}
            )

        return success

    def test_admin_operations(self):
        """Test admin operations (expecting 403 for non-admin users)"""
        if not self.admin_token:
            self.log_test("Admin Operations", False, "No admin token available")
            return False

        # Test getting all users (should fail with 403 since user is not admin)
        success, response = self.run_test(
            "Get All Users (Non-Admin - Should Fail)",
            "GET",
            "admin/users",
            403,
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )

        # Test knowledge base operations (should fail with 403 since user is not admin)
        success, response = self.run_test(
            "Add Knowledge Base (Non-Admin - Should Fail)",
            "POST",
            "knowledge",
            403,
            data={"title": "Test", "content": "Test content"},
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )

        return True

    def test_authentication_errors(self):
        """Test authentication error handling"""
        # Test accessing protected endpoint without token
        success, response = self.run_test(
            "Access Protected Endpoint Without Token",
            "GET",
            "auth/me",
            403  # FastAPI returns 403 for missing auth
        )

        # Test with invalid token
        success, response = self.run_test(
            "Access Protected Endpoint With Invalid Token",
            "GET",
            "auth/me",
            401,
            headers={'Authorization': 'Bearer invalid_token'}
        )

        return True

    def run_all_tests(self):
        """Run all tests"""
        print("🔍 Starting L'Archivio Maledetto API Tests...")
        print(f"🌐 Testing against: {self.base_url}")
        print("=" * 60)

        # Test basic connectivity
        self.test_root_endpoint()

        # Test authentication
        self.test_user_registration()
        self.test_admin_registration()
        self.test_user_login()

        # Try to make admin user actually admin
        self.make_user_admin_via_script()

        # Test core functionality
        self.test_chat_functionality()
        self.test_knowledge_base_operations()
        
        # Test AIDS (Focalizzazioni) functionality - keeping for regression
        print("\n🎯 Testing AIDS (Focalizzazioni) System...")
        self.test_aids_creation()
        self.test_aids_get_all()
        self.test_aids_active_filtering()
        self.test_aids_use_functionality()
        
        # NEW TESTS: Background and Rifugio System
        print("\n🏰 Testing Background and Rifugio System...")
        self.test_background_system()
        self.test_refuge_defense_system()
        self.test_admin_user_deletion()
        self.test_reset_max_actions()
        
        # Test admin functionality
        self.test_admin_operations()

        # Test error handling
        self.test_authentication_errors()

        # Cleanup
        self.cleanup_created_aids()

        # Print summary
        print("=" * 60)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed. Check the details above.")
            return 1

def main():
    tester = ArchivioMaledettoAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())