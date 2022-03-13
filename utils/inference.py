'''
Max-Planck-Gesellschaft zur Foerderung der Wissenschaften e.V. (MPG) is holder of all proprietary rights on this
computer program.

You can only use this computer program if you have closed a license agreement with MPG or you get the right to use
the computer program from someone who is authorized to grant you that right.

Any use of the computer program without a valid license is prohibited and liable to prosecution.

Copyright 2019 Max-Planck-Gesellschaft zur Foerderung der Wissenschaften e.V. (MPG). acting on behalf of its
Max Planck Institute for Intelligent Systems and the Max Planck Institute for Biological Cybernetics.
All rights reserved.

More information about VOCA is available at http://voca.is.tue.mpg.de.
For comments or questions, please email us at voca@tue.mpg.de
'''


import os
import cv2
import scipy
import tempfile
import numpy as np
import tensorflow as tf
from subprocess import call
from scipy.io import wavfile
import time

from psbody.mesh import Mesh
from utils.audio_handler import AudioHandler
from utils.rendering import render_mesh_helper

from gtts import gTTS
from pydub import AudioSegment
from io import BytesIO


def process_audio(ds_path, audio, sample_rate):
    config = {}
    config['deepspeech_graph_fname'] = ds_path
    config['audio_feature_type'] = 'deepspeech'
    config['num_audio_features'] = 29

    config['audio_window_size'] = 16
    config['audio_window_stride'] = 1

    tmp_audio = {'subj': {'seq': {'audio': audio, 'sample_rate': sample_rate}}}
    audio_handler = AudioHandler(config)
    return audio_handler.process(tmp_audio)['subj']['seq']['audio']


def output_sequence_meshes(sequence_vertices, template, out_path, uv_template_fname='', texture_img_fname=''):
    mesh_out_path = os.path.join(out_path, 'meshes')
    if not os.path.exists(mesh_out_path):
        os.makedirs(mesh_out_path)

    if os.path.exists(uv_template_fname):
        uv_template = Mesh(filename=uv_template_fname)
        vt, ft = uv_template.vt, uv_template.ft
    else:
        vt, ft = None, None

    num_frames = sequence_vertices.shape[0]
    for i_frame in range(num_frames):
        out_fname = os.path.join(mesh_out_path, '%05d.obj' % i_frame)
        out_mesh = Mesh(sequence_vertices[i_frame], template.f)
        if vt is not None and ft is not None:
            out_mesh.vt, out_mesh.ft = vt, ft
        if os.path.exists(texture_img_fname):
            out_mesh.set_texture_image(texture_img_fname)
        out_mesh.write_obj(out_fname)


def render_sequence_meshes(audio_fname, sequence_vertices, template, out_path, uv_template_fname='', texture_img_fname=''):
    if not os.path.exists(out_path):
        os.makedirs(out_path)

    tmp_video_file = tempfile.NamedTemporaryFile('w', suffix='.mp4', dir=out_path)
    if int(cv2.__version__[0]) < 3:
        writer = cv2.VideoWriter(tmp_video_file.name, cv2.cv.CV_FOURCC(*'mp4v'), 60, (800, 800), True)
    else:
        writer = cv2.VideoWriter(tmp_video_file.name, cv2.VideoWriter_fourcc(*'mp4v'), 60, (800, 800), True)

    if os.path.exists(uv_template_fname) and os.path.exists(texture_img_fname):
        uv_template = Mesh(filename=uv_template_fname)
        vt, ft = uv_template.vt, uv_template.ft
        tex_img = cv2.imread(texture_img_fname)[:,:,::-1]
    else:
        vt, ft = None, None
        tex_img = None

    num_frames = sequence_vertices.shape[0]
    center = np.mean(sequence_vertices[0], axis=0)
    for i_frame in range(num_frames):
        render_mesh = Mesh(sequence_vertices[i_frame], template.f)
        if vt is not None and ft is not None:
            render_mesh.vt, render_mesh.ft = vt, ft
        img = render_mesh_helper(render_mesh, center, tex_img=tex_img)
        writer.write(img)
    writer.release()

    video_fname = os.path.join(out_path, 'video.mp4')
    cmd = ('ffmpeg' + ' -i {0} -i {1} -vcodec h264 -ac 2 -channel_layout stereo -pix_fmt yuv420p {2}'.format(
        audio_fname, tmp_video_file.name, video_fname)).split()
    call(cmd)


def inference(tf_model_fname, ds_fname, audio_fname, text, template_fname, condition_idx, out_path, render_sequence=True, uv_template_fname='', texture_img_fname=''):
    template = Mesh(filename=template_fname)

    if text:
        # save to file for now
        tts = gTTS(text, lang='en')
        audio_fname = './audio/tts.mp3'
        tts.save(audio_fname)

        # instead of writing to file, store in local buffer for real-time app
        # mp3_data = BytesIO()
        # tts = gTTS(text, lang='en')
        # tts.write_to_fp(mp3_data)
        # mp3_data.seek(0)

        audio_seg = AudioSegment.from_file(audio_fname, format="mp3")
        audio = np.array(audio_seg.get_array_of_samples())
        sample_rate = audio_seg.frame_rate
    else:
        sample_rate, audio = wavfile.read(audio_fname)

    if audio.ndim != 1:
        print('Audio has multiple channels, only first channel is considered')
        audio = audio[:,0]

    # TODO: instead of tts then DeepSpeech, use text to directly produce (F, W, D) array
    # processed_audio.shape = (F, W, D)
    # F - number of frames
    # W - window size
    # D - size of alphabet
    processed_audio = process_audio(ds_fname, audio, sample_rate)
    
    # Load previously saved meta graph in the default graph
    saver = tf.train.import_meta_graph(tf_model_fname + '.meta')
    graph = tf.get_default_graph()

    speech_features = graph.get_tensor_by_name(u'VOCA/Inputs_encoder/speech_features:0')
    condition_subject_id = graph.get_tensor_by_name(u'VOCA/Inputs_encoder/condition_subject_id:0')
    is_training = graph.get_tensor_by_name(u'VOCA/Inputs_encoder/is_training:0')
    input_template = graph.get_tensor_by_name(u'VOCA/Inputs_decoder/template_placeholder:0')
    output_decoder = graph.get_tensor_by_name(u'VOCA/output_decoder:0')

    num_frames = processed_audio.shape[0]
    feed_dict = {speech_features: np.expand_dims(np.stack(processed_audio), -1),
                 condition_subject_id: np.repeat(condition_idx-1, num_frames),
                 is_training: False,
                 input_template: np.repeat(template.v[np.newaxis, :, :, np.newaxis], num_frames, axis=0)}

    with tf.Session() as session:
        # Restore trained model
        saver.restore(session, tf_model_fname)
        predicted_vertices = np.squeeze(session.run(output_decoder, feed_dict))

        timerFile = open('performance_tracker.txt', 'w')
        outTime1 = time.perf_counter()
        timerFile.write(f"Started output_sequence_meshes at: {outTime1:0.2f}\n")

        output_sequence_meshes(predicted_vertices, template, out_path)

        outTime2 = time.perf_counter()
        timerFile.write(f"Ended output_sequence_meshes at: {outTime2:0.2f}\n")
        timerFile.write(f"Total time for output_sequence_meshes: {outTime2-outTime1:0.2f}\n\n")

        if(render_sequence):
            renderTime1 = time.perf_counter()
            timerFile.write(f"Started render_sequence_meshes at: {renderTime1:0.2f}\n")

            render_sequence_meshes(audio_fname, predicted_vertices, template, out_path, uv_template_fname, texture_img_fname)

            renderTime2 = time.perf_counter()
            timerFile.write(f"Ended render_sequence_meshes at: {renderTime2:0.2f}\n")
            timerFile.write(f"Total time for render_sequence_meshes: {renderTime2-renderTime1:0.2f}\n\n")

        timerFile.close()
    tf.reset_default_graph()


def inference_interpolate_styles(tf_model_fname, ds_fname, audio_fname, template_fname, condition_weights, out_path):
    template = Mesh(filename=template_fname)

    sample_rate, audio = wavfile.read(audio_fname)
    if audio.ndim != 1:
        print('Audio has multiple channels, only first channel is considered')
        audio = audio[:, 0]

    processed_audio = process_audio(ds_fname, audio, sample_rate)

    # Load previously saved meta graph in the default graph
    saver = tf.train.import_meta_graph(tf_model_fname + '.meta')
    graph = tf.get_default_graph()

    speech_features = graph.get_tensor_by_name(u'VOCA/Inputs_encoder/speech_features:0')
    condition_subject_id = graph.get_tensor_by_name(u'VOCA/Inputs_encoder/condition_subject_id:0')
    is_training = graph.get_tensor_by_name(u'VOCA/Inputs_encoder/is_training:0')
    input_template = graph.get_tensor_by_name(u'VOCA/Inputs_decoder/template_placeholder:0')
    output_decoder = graph.get_tensor_by_name(u'VOCA/output_decoder:0')

    non_zeros = np.where(condition_weights > 0.0)[0]
    condition_weights[non_zeros] /= sum(condition_weights[non_zeros])

    num_frames = processed_audio.shape[0]
    output_vertices = np.zeros((num_frames, template.v.shape[0], template.v.shape[1]))

    with tf.Session() as session:
        # Restore trained model
        saver.restore(session, tf_model_fname)

        for condition_id in non_zeros:
            feed_dict = {speech_features: np.expand_dims(np.stack(processed_audio), -1),
                         condition_subject_id: np.repeat(condition_id, num_frames),
                         is_training: False,
                         input_template: np.repeat(template.v[np.newaxis, :, :, np.newaxis], num_frames, axis=0)}
            predicted_vertices = np.squeeze(session.run(output_decoder, feed_dict))
            output_vertices += condition_weights[condition_id] * predicted_vertices

        output_sequence_meshes(output_vertices, template, out_path)
