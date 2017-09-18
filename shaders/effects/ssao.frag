#version 450
#extension GL_ARB_separate_shader_objects : enable

layout(location = 0) out vec4 outColor;

layout(location = 0) in vec2 uv;
layout(binding = 0) uniform sampler2D posMap;
layout(binding = 1) uniform sampler2D normalMap;
layout(binding = 2) uniform sampler2D colorMap;
layout(binding = 3) uniform sampler2D rotationSSAO;

layout(binding = 4) uniform UBO {
	mat4        proj;
	vec4        kernels[64];
} ubo;

const vec2 noiseScale = vec2(1280.0/4.0f,720.0/4.0f);

const float biasSSAO   = 0.025f;
const int   kernelSize = 64;
const float radius = 0.5f;

void main() {
	vec4 posData = vec4(texture(posMap,uv).rgb,1.0f);
	vec3 pos    = posData.xyz;
	vec3 normal = (texture(normalMap,uv)).rgb;
	vec3 random = texture(rotationSSAO,uv*noiseScale).xyz;

	vec3 tangent = normalize(random-normal*dot(random,normal));
	vec3 bi      = cross(normal,tangent);
	mat3 TBN     = mat3(tangent,bi,normal);

	float occlusion = 0.0;

	for(int i = 0; i < kernelSize; ++i){
	    // get sample position
	    vec3 s = TBN * ubo.kernels[i].xyz; // From tangent to view-space
	    s = pos + s * radius;

	    vec4 offset = vec4(s, 1.0);
		offset      = ubo.proj * offset;
		offset.xyz /= offset.w;
		offset.xyz  = offset.xyz * 0.5 + 0.5;

		vec4 posCurr = vec4(texture(posMap, offset.xy).rgb,1.0f);
		float sampleDepth = posCurr.z;

		float rangeCheck = smoothstep(0.0, 1.0, radius / abs(pos.z - sampleDepth));
		occlusion       += (sampleDepth >= s.z + biasSSAO ? 1.0 : 0.0) * rangeCheck;
	}

	occlusion = 1.0 - (occlusion / kernelSize);
	outColor = vec4(vec3(occlusion),1.0f);
}