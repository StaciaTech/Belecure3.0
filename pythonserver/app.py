import os
import sys
import gc
import time
import psutil
import logging
import threading
from datetime import datetime
from functools import wraps
from io import BytesIO

import PIL
import numpy
from numpy import zeros, asarray, expand_dims
import tensorflow as tf
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from werkzeug.utils import secure_filename
import skimage.color

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()  # Load .env file if it exists
except ImportError:
    logger.warning("python-dotenv not installed. Using system environment variables only.")

# Import Mask R-CNN components
from mrcnn.config import Config
from mrcnn.model import MaskRCNN, mold_image

# Configure logging with smart defaults
log_level = getattr(logging, os.getenv('LOG_LEVEL', 'INFO').upper(), logging.INFO)
logging.basicConfig(
    level=log_level,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Configuration class with smart defaults
class AppConfig:
    # Core settings from environment
    ENV = os.getenv('FLASK_ENV', 'production')
    DEBUG = ENV == 'development'  # Auto-detect debug mode
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 5000))
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*')
    
    # Smart defaults for all other settings
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf'}
    WEIGHTS_FOLDER = './weights'
    WEIGHTS_FILE_NAME = 'maskrcnn_15_epochs.h5'
    MODEL_NAME = 'mask_rcnn_hq'
    REQUEST_TIMEOUT = 300  # 5 minutes
    MEMORY_THRESHOLD_MB = 4096  # 4GB
    TESTING = False
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO').upper()
    APP_LOG = 'app.log'

class PredictionConfig(Config):
    NAME = "floorPlan_cfg"
    NUM_CLASSES = 1 + 3  # background + door + wall + window
    GPU_COUNT = 1
    IMAGES_PER_GPU = 1

# Global variables for model and monitoring
_model = None
_graph = None
_cfg = None
_model_loaded = False
_model_lock = threading.Lock()
_request_count = 0
_start_time = time.time()

# Memory monitoring (fallback if psutil not available)
class MemoryMonitor:
    def __init__(self):
        try:
            import psutil
            self.process = psutil.Process()
            self.psutil_available = True
        except ImportError:
            logger.warning("psutil not available. Using basic memory monitoring.")
            self.psutil_available = False
        
        self.peak_memory = 0
        self.current_memory = 0
        
    def update(self):
        if self.psutil_available:
            try:
                memory_info = self.process.memory_info()
                self.current_memory = memory_info.rss / 1024 / 1024  # MB
                self.peak_memory = max(self.peak_memory, self.current_memory)
                
                # Log warning if memory usage is high
                if self.current_memory > AppConfig.MEMORY_THRESHOLD_MB:
                    logger.warning(f"High memory usage: {self.current_memory:.2f} MB")
                    
                return {
                    'current_mb': round(self.current_memory, 2),
                    'peak_mb': round(self.peak_memory, 2),
                    'cpu_percent': self.process.cpu_percent(),
                    'memory_percent': self.process.memory_percent()
                }
            except Exception as e:
                logger.warning(f"Error getting memory stats: {e}")
                return self._get_basic_stats()
        else:
            return self._get_basic_stats()
    
    def _get_basic_stats(self):
        """Fallback memory stats when psutil is not available"""
        import resource
        try:
            # Get memory usage in MB (works on Unix-like systems)
            memory_usage = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
            # On Linux/Mac, ru_maxrss is in KB, on some systems it's in bytes
            if memory_usage > 1000000:  # Likely in bytes
                memory_usage = memory_usage / 1024 / 1024
            else:  # Likely in KB
                memory_usage = memory_usage / 1024
                
            self.current_memory = memory_usage
            self.peak_memory = max(self.peak_memory, self.current_memory)
            
            return {
                'current_mb': round(self.current_memory, 2),
                'peak_mb': round(self.peak_memory, 2),
                'cpu_percent': 0.0,  # Not available without psutil
                'memory_percent': 0.0  # Not available without psutil
            }
        except:
            return {
                'current_mb': 0.0,
                'peak_mb': 0.0,
                'cpu_percent': 0.0,
                'memory_percent': 0.0
            }

memory_monitor = MemoryMonitor()

# Flask app setup with minimal configuration
app = Flask(__name__)
app.config.from_object(AppConfig)

# Set environment
os.environ['FLASK_ENV'] = AppConfig.ENV
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Suppress TensorFlow warnings
app.env = AppConfig.ENV

# Configure CORS with environment variable support
cors_origins = AppConfig.CORS_ORIGINS
if cors_origins == '*':
    CORS(app, resources={r"/*": {"origins": "*"}})
else:
    origins_list = [origin.strip() for origin in cors_origins.split(',')]
    CORS(app, resources={r"/*": {"origins": origins_list}})

# Suppress Flask development server warning
import logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in AppConfig.ALLOWED_EXTENSIONS

def load_model():
    """Load the Mask R-CNN model safely"""
    global _model, _graph, _cfg, _model_loaded
    
    if _model_loaded:
        return True
        
    try:
        with _model_lock:
            if _model_loaded:  # Double-check pattern
                return True
                
            logger.info("Loading Mask R-CNN model...")
            start_time = time.time()
            
            # Check if weights file exists
            weights_path = os.path.join(AppConfig.WEIGHTS_FOLDER, AppConfig.WEIGHTS_FILE_NAME)
            if not os.path.exists(weights_path):
                logger.error(f"Model weights not found at {weights_path}")
                return False
            
            # Create model configuration
            _cfg = PredictionConfig()
            logger.info(f"Model config - Image resize mode: {_cfg.IMAGE_RESIZE_MODE}")
            
            # Load model
            model_folder_path = os.path.abspath("./mrcnn")
            _model = MaskRCNN(mode='inference', model_dir=model_folder_path, config=_cfg)
            
            # Load weights
            _model.load_weights(weights_path, by_name=True)
            
            # Get TensorFlow graph
            _graph = tf.get_default_graph()
            
            _model_loaded = True
            load_time = time.time() - start_time
            memory_monitor.update()
            
            logger.info(f"Model loaded successfully in {load_time:.2f} seconds")
            logger.info(f"Memory usage after model load: {memory_monitor.current_memory:.2f} MB")
            
            return True
            
    except Exception as e:
        logger.error(f"Failed to load model: {str(e)}")
        return False

def monitor_request(f):
    """Decorator to monitor request performance and memory usage"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        global _request_count
        _request_count += 1
        
        start_time = time.time()
        memory_before = memory_monitor.update()
        
        try:
            result = f(*args, **kwargs)
            
            # Monitor after request
            memory_after = memory_monitor.update()
            processing_time = time.time() - start_time
            
            logger.info(f"Request {_request_count} completed in {processing_time:.2f}s - "
                       f"Memory: {memory_after['current_mb']:.2f}MB "
                       f"(+{memory_after['current_mb'] - memory_before['current_mb']:.2f}MB)")
            
            return result
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Request {_request_count} failed after {processing_time:.2f}s: {str(e)}")
            raise
        finally:
            # Force garbage collection after each request
            gc.collect()
            
    return decorated_function

def process_image(image_input):
    """Process input image for model inference"""
    try:
        image = numpy.asarray(image_input)
        h, w, c = image.shape
        
        if image.ndim != 3:
            image = skimage.color.gray2rgb(image)
        if image.shape[-1] == 4:
            image = image[..., :3]
            
        return image, w, h
    except Exception as e:
        logger.error(f"Image processing failed: {str(e)}")
        raise

def get_class_names(class_ids):
    """Convert class IDs to class names"""
    class_mapping = {1: 'wall', 2: 'window', 3: 'door'}
    return [{'name': class_mapping.get(class_id, 'unknown')} for class_id in class_ids]

def normalize_points(bbx, class_names):
    """Normalize bounding box coordinates"""
    result = []
    door_count = 0
    door_difference = 0
    
    for index, bb in enumerate(bbx):
        if index < len(class_names) and class_names[index] == 3:  # door
            door_count += 1
            if abs(bb[3] - bb[1]) > abs(bb[2] - bb[0]):
                door_difference += abs(bb[3] - bb[1])
            else:
                door_difference += abs(bb[2] - bb[0])
        
        result.append([bb[0], bb[1], bb[2], bb[3]])
    
    average_door = door_difference / door_count if door_count > 0 else 0
    return result, average_door

def format_predictions(objects_arr):
    """Format prediction results to JSON"""
    return [{'x1': obj[1], 'y1': obj[0], 'x2': obj[3], 'y2': obj[2]} for obj in objects_arr]

# Routes
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    memory_stats = memory_monitor.update()
    uptime = time.time() - _start_time
    
    return jsonify({
        'status': 'healthy',
        'model_loaded': _model_loaded,
        'uptime_seconds': round(uptime, 2),
        'requests_processed': _request_count,
        'memory_stats': memory_stats,
        'tensorflow_version': tf.__version__,
        'environment': 'production'
    })

@app.route('/metrics', methods=['GET'])
def metrics():
    """Detailed metrics endpoint"""
    memory_stats = memory_monitor.update()
    uptime = time.time() - _start_time
    
    return jsonify({
        'uptime_seconds': round(uptime, 2),
        'requests_processed': _request_count,
        'requests_per_second': round(_request_count / uptime, 2) if uptime > 0 else 0,
        'memory_current_mb': memory_stats['current_mb'],
        'memory_peak_mb': memory_stats['peak_mb'],
        'memory_percent': memory_stats['memory_percent'],
        'cpu_percent': memory_stats['cpu_percent'],
        'model_loaded': _model_loaded,
        'tensorflow_version': tf.__version__,
        'python_version': sys.version,
        'environment': 'production',
        'psutil_available': memory_monitor.psutil_available
    })

@app.route('/predict', methods=['POST'])
@monitor_request
def predict():
    """Main prediction endpoint"""
    try:
        # Ensure model is loaded
        if not _model_loaded:
            if not load_model():
                return jsonify({'error': 'Model not loaded', 'success': False}), 500
        
        # Validate request
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided', 'success': False}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected', 'success': False}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type', 'success': False}), 400
        
        # Process image
        try:
            image_input = PIL.Image.open(file.stream)
            image, w, h = process_image(image_input)
        except Exception as e:
            logger.error(f"Image processing error: {str(e)}")
            return jsonify({'error': 'Invalid image file', 'success': False}), 400
        
        # Run model inference
        try:
            scaled_image = mold_image(image, _cfg)
            sample = expand_dims(scaled_image, 0)
            
            with _graph.as_default():
                predictions = _model.detect(sample, verbose=0)[0]
            
            # Process results
            bbx = predictions['rois'].tolist()
            normalized_points, average_door = normalize_points(bbx, predictions['class_ids'])
            formatted_points = format_predictions(normalized_points)
            class_names = get_class_names(predictions['class_ids'])
            
            response_data = {
                'success': True,
                'points': formatted_points,
                'classes': class_names,
                'width': w,
                'height': h,
                'average_door': average_door,
                'num_detections': len(bbx),
                'processing_info': {
                    'request_id': _request_count,
                    'timestamp': datetime.now().isoformat()
                }
            }
            
            return jsonify(response_data)
            
        except Exception as e:
            logger.error(f"Model inference error: {str(e)}")
            return jsonify({'error': 'Model inference failed', 'success': False}), 500
            
    except Exception as e:
        logger.error(f"Unexpected error in prediction: {str(e)}")
        return jsonify({'error': 'Internal server error', 'success': False}), 500

@app.route('/', methods=['POST'])
@monitor_request
def prediction_legacy():
    """Legacy endpoint for backward compatibility"""
    return predict()

@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'File too large', 'success': False}), 413

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found', 'success': False}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error', 'success': False}), 500

# Initialize model on startup
@app.before_first_request
def initialize():
    """Initialize the application"""
    logger.info("Initializing FloorPlanTo3D Production API...")
    memory_stats = memory_monitor.update()
    logger.info(f"Initial memory usage: {memory_stats['current_mb']:.2f} MB")
    logger.info("Production environment configured")
    
    if not load_model():
        logger.error("Failed to load model during initialization")

if __name__ == '__main__':
    # Production-ready server configuration
    logger.info("Starting FloorPlanTo3D Production API...")
    logger.info("Server optimized for concurrent requests and memory monitoring")
    app.run(
        debug=False, 
        host='0.0.0.0', 
        port=5000, 
        threaded=True,
        use_reloader=False  # Disable reloader for production
    ) 