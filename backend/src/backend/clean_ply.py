import open3d as o3d
import numpy as np
import logging
from tqdm import tqdm

def remove_floating_artifacts(input_file, output_file, voxel_size=0.1, min_points=50, eps=0.2):
    logging.info(f"Starting to process {input_file}")

    # Load the point cloud
    logging.info("Loading point cloud...")
    pcd = o3d.io.read_point_cloud(input_file)
    logging.info(f"Loaded point cloud with {len(pcd.points)} points")

    # Voxel down-sampling to reduce computation time
    logging.info("Performing voxel down-sampling...")
    downsampled_pcd = pcd.voxel_down_sample(voxel_size)
    logging.info(f"Down-sampled to {len(downsampled_pcd.points)} points")

    # Compute normals
    logging.info("Computing normals...")
    downsampled_pcd.estimate_normals(search_param=o3d.geometry.KDTreeSearchParamHybrid(radius=0.2, max_nn=50))
    logging.info("Normals computed")

    # Cluster the point cloud
    logging.info("Clustering point cloud...")
    labels = np.array(downsampled_pcd.cluster_dbscan(eps=eps, min_points=min_points))
    logging.info(f"Clustering complete. Found {len(np.unique(labels[labels >= 0]))} clusters")

    # Check if any clusters were found
    if len(labels[labels >= 0]) > 0:
        # Get the largest cluster (assumed to be the main object)
        largest_cluster_label = np.argmax(np.bincount(labels[labels >= 0]))
        
        # Create a new point cloud with only the largest cluster
        cleaned_pcd = downsampled_pcd.select_by_index(np.where(labels == largest_cluster_label)[0])
        
        # Save the cleaned point cloud
        o3d.io.write_point_cloud(output_file, cleaned_pcd)
        logging.info(f"Cleaned point cloud saved to {output_file}")
    else:
        logging.warning("No clusters found. Trying with more relaxed parameters...")
        return remove_floating_artifacts(input_file, output_file, voxel_size * 1.5, min_points - 10, eps * 1.5)

# Example usage
input_file = "jas.ply"
output_file = "cleaned_jas.ply"
remove_floating_artifacts(input_file, output_file)
