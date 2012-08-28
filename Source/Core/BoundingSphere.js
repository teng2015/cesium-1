/*global define*/
define([
        './defaultValue',
        './Cartesian3',
        './Cartographic',
        './DeveloperError',
        './Ellipsoid',
        './EquidistantCylindricalProjection',
        './Extent',
        './Intersect',
        './Math'
    ], function(
        defaultValue,
        Cartesian3,
        Cartographic,
        DeveloperError,
        Ellipsoid,
        EquidistantCylindricalProjection,
        Extent,
        Intersect,
        CesiumMath) {
    "use strict";

    /**
     * A bounding sphere with a center and a radius.
     *
     * @alias BoundingSphere
     * @constructor
     *
     * @param {Cartesian3} [center=Cartesian3.ZERO] The center of the bounding sphere.
     * @param {Number} [radius=0.0] The radius of the bounding sphere.
     *
     * @see AxisAlignedBoundingBox
     */
    var BoundingSphere = function(center, radius) {
        /**
         * The center point of the sphere.
         *
         * @type {Cartesian3}
         */
        this.center = (typeof center !== 'undefined') ? Cartesian3.clone(center) : Cartesian3.ZERO.clone();
        /**
         * The radius of the sphere.
         *
         * @type {Number}
         */
        this.radius = defaultValue(radius, 0.0);
    };

    /**
     * Creates a bounding sphere that contains both the left and right bounding spheres.
     * @memberof BoundingSphere
     *
     * @param {BoundingSphere} left A sphere to enclose in a bounding sphere.
     * @param {BoundingSphere} right A sphere to enclose in a bounding sphere.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     *
     * @exception {DeveloperError} left is required.
     * @exception {DeveloperError} right is required.
     *
     * @return {BoundingSphere} A sphere that encloses both left and right bounding spheres.
     */
    BoundingSphere.union = function(left, right, result) {
        if (typeof left === 'undefined') {
            throw new DeveloperError('left is required.');
        }

        if (typeof right === 'undefined') {
            throw new DeveloperError('right is required.');
        }

        if (typeof result === 'undefined') {
            result = new BoundingSphere();
        }

        var center = left.center.add(right.center).multiplyByScalar(0.5);
        var radius1 = left.center.subtract(center).magnitude() + left.radius;
        var radius2 = right.center.subtract(center).magnitude() + right.radius;
        var radius = Math.max(radius1, radius2);

        result.center.x = center.x;
        result.center.y = center.y;
        result.center.z = center.z;
        result.radius = radius;
        return result;
    };

    /**
     * Creates a bounding sphere that is sphere expanded to contain point.
     * @memberof BoundingSphere
     *
     * @param {BoundingSphere} sphere A sphere to expand.
     * @param {Cartesian3} point A point to enclose in a bounding sphere.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     *
     * @exception {DeveloperError} sphere is required.
     * @exception {DeveloperError} point is required.
     *
     * @return {BoundingSphere} A sphere that encloses the point.
     */
    BoundingSphere.expand = function(sphere, point, result) {
        if (typeof sphere === 'undefined') {
            throw new DeveloperError('sphere is required.');
        }

        if (typeof point === 'undefined') {
            throw new DeveloperError('point is required.');
        }

        point = Cartesian3.clone(point);
        result = BoundingSphere.clone(sphere, result);

        var radius = point.subtract(result.center).magnitude();
        if (radius > result.radius) {
            result.radius = radius;
        }

        return result;
    };

    /**
     * Duplicates a BoundingSphere instance.
     * @memberof BoundingSphere
     *
     * @param {BoundingSphere} sphere The bounding sphere to duplicate.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @return {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     *
     * @exception {DeveloperError} sphere is required.
     */
    BoundingSphere.clone = function(sphere, result) {
        if (typeof sphere === 'undefined') {
            throw new DeveloperError('sphere is required');
        }

        if (typeof result === 'undefined') {
            return new BoundingSphere(sphere.center, sphere.radius);
        }

        result.center = sphere.center.clone();
        result.radius = sphere.radius;
        return result;
    };

    /**
     * Compares the provided BoundingSphere componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof BoundingSphere
     *
     * @param {BoundingSphere} [left] The first BoundingSphere.
     * @param {BoundingSphere} [right] The second BoundingSphere.
     * @return {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    BoundingSphere.equals = function(left, right) {
        return (left === right) ||
               ((typeof left !== 'undefined') &&
                (typeof right !== 'undefined') &&
                (left.center.equals(right.center)) &&
                (left.radius === right.radius));
    };

    /**
     * Computes a tight-fitting bounding sphere enclosing a list of 3D Cartesian points.
     * The bounding sphere is computed by running two algorithms, a naive algorithm and Ritter's algorithm. The
     * smaller of the two spheres is used to ensure a tight fit.
     *
     * @param {Array} positions List of points that the bounding sphere will enclose.  Each point must have <code>x</code>, <code>y</code>, and <code>z</code> properties.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     *
     * @return {BoundingSphere} The bounding sphere computed from positions.
     *
     * @see <a href='http://blogs.agi.com/insight3d/index.php/2008/02/04/a-bounding/'>Bounding Sphere computation article</a>
     */
    BoundingSphere.fromPoints = function(positions, result) {
        if (typeof result === 'undefined') {
            result = new BoundingSphere();
        }

        if (typeof positions === 'undefined' || positions.length === 0) {
            result.center = Cartesian3.ZERO.clone(result.center);
            result.radius = 0.0;
            return result;
        }

        var currentPos = Cartesian3.clone(positions[0]);

        var xMin = Cartesian3.clone(currentPos);
        var yMin = Cartesian3.clone(currentPos);
        var zMin = Cartesian3.clone(currentPos);

        var xMax = Cartesian3.clone(currentPos);
        var yMax = Cartesian3.clone(currentPos);
        var zMax = Cartesian3.clone(currentPos);

        var numPositions = positions.length;
        for ( var i = 1; i < numPositions; i++) {
            Cartesian3.clone(positions[i], currentPos);

            var x = currentPos.x;
            var y = currentPos.y;
            var z = currentPos.z;

            // Store points containing the the smallest and largest components
            if (x < xMin.x) {
                Cartesian3.clone(currentPos, xMin);
            }

            if (x > xMax.x) {
                Cartesian3.clone(currentPos, xMax);
            }

            if (y < yMin.y) {
                Cartesian3.clone(currentPos, yMin);
            }

            if (y > yMax.y) {
                Cartesian3.clone(currentPos, yMax);
            }

            if (z < zMin.z) {
                Cartesian3.clone(currentPos, zMin);
            }

            if (z > zMax.z) {
                Cartesian3.clone(currentPos, zMax);
            }
        }

        // Compute x-, y-, and z-spans (Squared distances b/n each component's min. and max.).
        var xSpan = (xMax.subtract(xMin)).magnitudeSquared();
        var ySpan = (yMax.subtract(yMin)).magnitudeSquared();
        var zSpan = (zMax.subtract(zMin)).magnitudeSquared();

        // Set the diameter endpoints to the largest span.
        var diameter1 = xMin;
        var diameter2 = xMax;
        var maxSpan = xSpan;
        if (ySpan > maxSpan) {
            maxSpan = ySpan;
            diameter1 = yMin;
            diameter2 = yMax;
        }
        if (zSpan > maxSpan) {
            maxSpan = zSpan;
            diameter1 = zMin;
            diameter2 = zMax;
        }

        // Calculate the center of the initial sphere found by Ritter's algorithm
        var ritterCenter = new Cartesian3(
                (diameter1.x + diameter2.x) * 0.5,
                (diameter1.y + diameter2.y) * 0.5,
                (diameter1.z + diameter2.z) * 0.5);

        // Calculate the radius of the initial sphere found by Ritter's algorithm
        var radiusSquared = (diameter2.subtract(ritterCenter)).magnitudeSquared();
        var ritterRadius = Math.sqrt(radiusSquared);

        // Find the center of the sphere found using the Naive method.
        var minBoxPt = new Cartesian3(xMin.x, yMin.y, zMin.z);
        var maxBoxPt = new Cartesian3(xMax.x, yMax.y, zMax.z);
        var naiveCenter = (minBoxPt.add(maxBoxPt)).multiplyByScalar(0.5);

        // Begin 2nd pass to find naive radius and modify the ritter sphere.
        var naiveRadius = 0;
        for (i = 0; i < numPositions; i++) {
            Cartesian3.clone(positions[i], currentPos);

            // Find the furthest point from the naive center to calculate the naive radius.
            var r = (currentPos.subtract(naiveCenter)).magnitude();
            if (r > naiveRadius) {
                naiveRadius = r;
            }

            // Make adjustments to the Ritter Sphere to include all points.
            var oldCenterToPointSquared = (currentPos.subtract(ritterCenter)).magnitudeSquared();
            if (oldCenterToPointSquared > radiusSquared) {
                var oldCenterToPoint = Math.sqrt(oldCenterToPointSquared);
                // Calculate new radius to include the point that lies outside
                ritterRadius = (ritterRadius + oldCenterToPoint) * 0.5;
                radiusSquared = ritterRadius * ritterRadius;
                // Calculate center of new Ritter sphere
                var oldToNew = oldCenterToPoint - ritterRadius;
                ritterCenter = new Cartesian3(
                        (ritterRadius * ritterCenter.x + oldToNew * currentPos.x) / oldCenterToPoint,
                        (ritterRadius * ritterCenter.y + oldToNew * currentPos.y) / oldCenterToPoint,
                        (ritterRadius * ritterCenter.z + oldToNew * currentPos.z) / oldCenterToPoint);
            }
        }

        if (ritterRadius < naiveRadius) {
            result.center = ritterCenter;
            result.radius = ritterRadius;
        } else {
            result.center = naiveCenter;
            result.radius = naiveRadius;
        }

        return result;
    };

    /**
     * Creates a bounding sphere from an extent projected in 2D.
     *
     * @memberof BoundingSphere
     *
     * @param {Extent} extent The valid extent used to create a bounding sphere.
     * @param {Object} [projection=EquidistantCylindricalProjection] The projection used to project the extent into 2D.
     *
     * @exception {DeveloperError} extent is required.
     *
     * @returns {BoundingSphere} The bounding sphere containing the extent.
     */
    BoundingSphere.fromExtent2D = function(extent, projection) {
        if (typeof extent === 'undefined') {
            throw new DeveloperError('extent is required.');
        }

        projection = projection || new EquidistantCylindricalProjection();

        var lowerLeft = projection.project(extent.getSouthwest());
        var upperRight = projection.project(extent.getNortheast());

        var width = upperRight.x - lowerLeft.x;
        var height = upperRight.y - lowerLeft.y;

        var center = new Cartesian3(lowerLeft.x + width * 0.5, lowerLeft.y + height * 0.5, 0.0);
        var radius = Math.sqrt(width * width + height * height) * 0.5;
        return new BoundingSphere(center, radius);
    };

    /**
     * Creates a bounding sphere from an extent in 3D. The bounding sphere is created using a subsample of points
     * on the ellipsoid and contained in the extent. It may not be accurate for all extents on all types of ellipsoids.
     *
     * @memberof BoundingSphere
     *
     * @param {Extent} extent The valid extent used to create a bounding sphere.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid used to determine positions of the extent.
     *
     * @exception {DeveloperError} extent is required.
     *
     * @returns {BoundingSphere} The bounding sphere containing the extent.
     */
    BoundingSphere.fromExtent3D = function(extent, ellipsoid) {
        if (typeof extent === 'undefined') {
            throw new DeveloperError('extent is required.');
        }

        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        return BoundingSphere.fromPoints(extent.subsample(ellipsoid));
    };

    /**
     * Determines which side of a plane a sphere is located.
     *
     * @memberof BoundingSphere
     *
     * @param {BoundingSphere} sphere The bounding sphere to test.
     * @param {Cartesian4} plane The coefficients of the plane in the for ax + by + cz + d = 0 where the coefficients a, b, c, and d are the components x, y, z, and w of the {Cartesian4}, respectively.
     *
     * @return {Intersect} {Intersect.INSIDE} if the entire sphere is on the side of the plane the normal is pointing, {Intersect.OUTSIDE} if the entire sphere is on the opposite side, and {Intersect.INTERSETING} if the sphere intersects the plane.
     *
     * @exception {DeveloperError} sphere is required.
     * @exception {DeveloperError} plane is required.
     */
    BoundingSphere.intersect = function(sphere, plane) {
        if (typeof sphere === 'undefined') {
            throw new DeveloperError('sphere is required.');
        }

        if (typeof plane === 'undefined') {
            throw new DeveloperError('plane is required.');
        }

        var center = sphere.center;
        var radius = sphere.radius;
        var distanceToPlane = Cartesian3.dot(plane, center) + plane.w;

        if (distanceToPlane < -radius) {
            // The center point is negative side of the plane normal
            return Intersect.OUTSIDE;
        } else if (distanceToPlane < radius) {
            // The center point is positive side of the plane, but radius extends beyond it; partial overlap
            return Intersect.INTERSECTING;
        }
        return Intersect.INSIDE;
    };

    /**
     * Creates a bounding sphere that contains both this bounding sphere and the argument sphere.
     * @memberof BoundingSphere
     *
     * @param {BoundingSphere} sphere The sphere to enclose in this bounding sphere.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     *
     * @exception {DeveloperError} sphere is required.
     *
     * @return {BoundingSphere} A sphere that encloses both this sphere and the argument sphere.
     */
    BoundingSphere.prototype.union = function(sphere, result) {
        if (typeof sphere === 'undefined') {
            throw new DeveloperError('sphere is required.');
        }

        return BoundingSphere.union(this, sphere, result);
    };

    /**
     * Creates a bounding sphere that is sphere expanded to contain point.
     * @memberof BoundingSphere
     *
     * @param {Cartesian3} point A point to enclose in a bounding sphere.
     *
     * @exception {DeveloperError} point is required.
     *
     * @return {BoundingSphere} A sphere that encloses the point.
     */
    BoundingSphere.prototype.expand = function(point, result) {
        if (typeof point === 'undefined') {
            throw new DeveloperError('point is required.');
        }

        return BoundingSphere.expand(this, point, result);
    };

    /**
     * Duplicates this BoundingSphere instance.
     * @memberof BoundingSphere
     *
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @return {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     */
    BoundingSphere.prototype.clone = function(result) {
        return BoundingSphere.clone(this, result);
    };

    /**
     * Determines which side of a plane the sphere is located.
     *
     * @memberof BoundingSphere
     *
     * @param {Cartesian4} plane The coefficients of the plane in the for ax + by + cz + d = 0 where the coefficients a, b, c, and d are the components x, y, z, and w of the {Cartesian4}, respectively.
     *
     * @return {Intersect} {Intersect.INSIDE} if the entire sphere is on the side of the plane the normal is pointing, {Intersect.OUTSIDE} if the entire sphere is on the opposite side, and {Intersect.INTERSETING} if the sphere intersects the plane.
     *
     * @exception {DeveloperError} plane is required.
     */
    BoundingSphere.prototype.intersect = function(plane) {
        if (typeof plane === 'undefined') {
            throw new DeveloperError('plane is required.');
        }

        return BoundingSphere.intersect(this, plane);
    };

    /**
     * Compares this BoundingSphere against the provided BoundingSphere componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof BoundingSphere
     *
     * @param {BoundingSphere} [right] The right hand side BoundingSphere.
     * @return {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    BoundingSphere.prototype.equals = function(right) {
        return BoundingSphere.equals(this, right);
    };

    return BoundingSphere;
});
