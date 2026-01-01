import requests
import sys
from datetime import datetime

class GoodDeedAPITester:
    def __init__(self, base_url="https://kindness-reminder-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, expected_keys=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, headers=headers, timeout=10)

            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                
                # Check response content if expected_keys provided
                if expected_keys:
                    try:
                        json_response = response.json()
                        print(f"   Response: {json_response}")
                        
                        # Validate expected keys exist
                        for key in expected_keys:
                            if key not in json_response:
                                print(f"❌ Missing expected key: {key}")
                                success = False
                                self.tests_passed -= 1
                                self.failed_tests.append(f"{name} - Missing key: {key}")
                                break
                        
                        if success:
                            print(f"✅ All expected keys present: {expected_keys}")
                            
                    except Exception as e:
                        print(f"❌ Failed to parse JSON response: {str(e)}")
                        success = False
                        self.tests_passed -= 1
                        self.failed_tests.append(f"{name} - JSON parse error: {str(e)}")
                else:
                    try:
                        json_response = response.json()
                        print(f"   Response: {json_response}")
                    except:
                        print(f"   Response (text): {response.text}")
                        
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text}")
                self.failed_tests.append(f"{name} - Status code mismatch: expected {expected_status}, got {response.status_code}")

            return success, response.json() if success and response.content else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append(f"{name} - Exception: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test(
            "Root Endpoint (/api/)",
            "GET",
            "api/",
            200,
            ["message"]
        )

    def test_get_all_deeds(self):
        """Test getting all deeds"""
        success, response = self.run_test(
            "Get All Deeds (/api/deeds)",
            "GET", 
            "api/deeds",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} deeds")
            if len(response) > 0:
                first_deed = response[0]
                if 'index' in first_deed and 'text' in first_deed:
                    print(f"   First deed: {first_deed}")
                    return True, response
                else:
                    print(f"❌ Deed structure invalid - missing 'index' or 'text'")
                    self.failed_tests.append("Get All Deeds - Invalid deed structure")
                    return False, {}
            else:
                print(f"❌ No deeds returned")
                self.failed_tests.append("Get All Deeds - Empty response")
                return False, {}
        
        return success, response

    def test_get_today_deed(self):
        """Test getting today's deed"""
        success, response = self.run_test(
            "Get Today's Deed (/api/deed/today)",
            "GET",
            "api/deed/today", 
            200,
            ["index", "text"]
        )
        
        if success:
            print(f"   Today's deed: {response.get('text', 'N/A')}")
            
        return success, response

    def test_get_deed_by_index(self, index=0):
        """Test getting deed by specific index"""
        success, response = self.run_test(
            f"Get Deed by Index (/api/deed/{index})",
            "GET",
            f"api/deed/{index}",
            200,
            ["index", "text"]
        )
        
        if success:
            print(f"   Deed {index}: {response.get('text', 'N/A')}")
            
        return success, response

def main():
    print("🚀 Starting Good Deed API Tests")
    print("=" * 50)
    
    # Setup
    tester = GoodDeedAPITester()
    
    # Run tests
    print("\n📋 Testing API Endpoints...")
    
    # Test root endpoint
    tester.test_root_endpoint()
    
    # Test get all deeds
    success, all_deeds = tester.test_get_all_deeds()
    
    # Test today's deed
    tester.test_get_today_deed()
    
    # Test specific deed by index
    tester.test_get_deed_by_index(0)
    tester.test_get_deed_by_index(5)
    
    # Test invalid index (should still return deed)
    tester.test_get_deed_by_index(999)
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Test Results:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%")
    
    if tester.failed_tests:
        print(f"\n❌ Failed Tests:")
        for failure in tester.failed_tests:
            print(f"   - {failure}")
    
    # Validate deed count consistency
    if success and all_deeds:
        print(f"\n🔍 Additional Validation:")
        print(f"   Backend has {len(all_deeds)} deeds")
        print(f"   Expected: Around 40 deeds as per requirements")
        
        if len(all_deeds) < 35:
            print(f"⚠️  Warning: Fewer deeds than expected (< 35)")
        elif len(all_deeds) > 45:
            print(f"⚠️  Warning: More deeds than expected (> 45)")
        else:
            print(f"✅ Deed count looks good")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())